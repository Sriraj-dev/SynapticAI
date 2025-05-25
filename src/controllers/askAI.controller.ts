
import { BaseMessage, HumanMessage, isAIMessage, isAIMessageChunk, isToolMessage } from "@langchain/core/messages";
import {agent} from "../services/agentGraph"
import { AgentRequest } from "../utils/apiModels/requestModels";
import { AgentEvent } from "../utils/apiModels/responseModels";
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
                streamMode: ["updates", "messages"],
                configurable:{
                    userId : userId,
                    sessionId : sessionId,
                    url: request.url,
                    context: request.context
                }
            }
        )
        
        const newMessages : BaseMessage[] = []

        for await (const chunk of agentStream) {
            if(chunk[0] === "updates"){
                /*
                Handle the Tool Messages or Tool Calls, which includes
                - Sending Intermediary messages to client, "userMessage" param inside tool calls.
                - Sending any Links, Like link to the notes which agent suggested.
                - Just sending tool message event to client, might ot might not be used asper clients convenience 
                */
               const chunkMessages = [
                ...(chunk[1]["agent"]?.messages || []),
                ...(chunk[1]["tools"]?.messages || [])
              ];
               
               for(const message of chunkMessages){
                    newMessages.push(message)

                    if(isToolMessage(message)){
                        console.log(`Tool Called - ${message.name}, artifacts : ${message.artifact}`)
                        console.log(message)

                        if(message.name === "semantic_note_search" && message.artifact && message.artifact.length){
                            const notes = message.artifact
                            console.log("semantic_tool response received")
                            for(const note of notes){
                                console.log("Note Link: ", note)
                                yield {
                                    type: "notes-link",
                                    data: {event:"notes-link", content: note}
                                }
                            }
                        }

                        yield {
                            type: "tool",
                            data: { event:"tool", content: message.content , tools_used: message.name},
                        };

                    }else if(isAIMessage(message)){
                        const {tool_calls, content} = message

                        if(!tool_calls || tool_calls.length === 0){
                            //This is the final response of the request --already streamed to the client.
                            yield {
                                type: "complete",
                                data: {event : "complete", content: content}
                            }
                        }else{
                            const combinedMessage = tool_calls.map(tool => tool.args?.userMessage || "").join(" ")
                            yield {
                                type: "message",
                                data: {event:"message", content: combinedMessage, tools_used: tool_calls.map(tool => tool.name).join(", ")},
                            }
                        }
                    }
               }
            }else if(chunk[0] === "messages"){
                /*
                This is basically the final response to the client
                This streams contents of the final response, but not the entire final response at once.
                */
                const [message,_metadata] = chunk[1]
                if(isAIMessageChunk(message)){
                    if(message.tool_call_chunks?.length || message.tool_calls?.length){
                        // Will be handled by the updates stream.
                    }else{
                        yield {
                            type: "stream",
                            data: { event:"stream", content: message.content }
                        }
                    }
                }
            }
        }


        //Save messages into redis:
        await RedisStorage.setItemAsync(`${userId}-${sessionId}`, JSON.stringify([...initialState.messages,...newMessages]), 3600)
    }
}