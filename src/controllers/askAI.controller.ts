
import { BaseMessage, HumanMessage, isAIMessage, isToolMessage } from "@langchain/core/messages";
import {agent} from "../services/agentGraph"
import { AgentRequest } from "../utils/apiModels/requestModels";
import { AgentEvent } from "../utils/apiModels/responseModels";
import { MessagesAnnotation } from "@langchain/langgraph";
import { RedisStorage } from "../services/redis/storage";
import { preprocessAgentContext } from "../utils/utility_methods";

export const AgentController = {
    async *invokeAgent(userId : string, sessionId:string, request : AgentRequest):AsyncGenerator<AgentEvent>{
        
        const cachedData = await RedisStorage.getItem(`${userId}-${sessionId}`);
        let chatHistory = JSON.parse(cachedData || '[]') as BaseMessage[];

        chatHistory = await preprocessAgentContext({messages: chatHistory})
        const initialState = {messages:[...chatHistory ,new HumanMessage(request.userMessage)]}

        //Invoke the graph with the chat history and the new Human message.
        const agentStream = await agent.stream(initialState,
            {
                streamMode: "updates",
                configurable:{
                    userId : userId,
                    sessionId : sessionId,
                    url: request.url,
                    context: request.context
                }
            }
        )
        
        const newMessages : BaseMessage[] = []

        for await (const chunk of agentStream){
            for (const [node, values] of Object.entries(chunk) as [string,typeof MessagesAnnotation.State][]) {
                const chunkMessages = values.messages || [];

                for (const message of chunkMessages) {
                    newMessages.push(message)

                    if (isToolMessage(message)) {
                        console.log(message)
                        yield {
                            type: "tool",
                            data: { event:"tool", content: message.content , tools_used: message.name},
                        };
                    } else if (isAIMessage(message)) {
                        const { tool_calls, content } = message;

                        if (!tool_calls || tool_calls.length === 0) {
                            yield {
                                type: "complete",
                                data: { event:"complete",content },
                            };
                        } else {
                            const combinedMessage = tool_calls
                                .map(tool => tool.args?.userMessage || "")
                                .join(" ");
                            yield {
                                type: "message",
                                data: {
                                    event: "message",
                                    content:combinedMessage , 
                                    tools_used: tool_calls.map(tool => tool.name).join(", ")
                                },
                            }; // This message is basically to keep the user engaged.
                        }
                    }
                }
            }
        }

        //Save messages into redis:
        await RedisStorage.setItemAsync(`${userId}-${sessionId}`, JSON.stringify([...initialState.messages,...newMessages]), 3600)
    }
}