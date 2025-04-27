/*
This agent graph is stateless and pre compiled which can be invoked using agentState as required.
*/
import "../config/env"
import { getCurrentDate, getCurrentUserInformation, addNote, addMultipleTasks, addSingleTask, getUsersTasks, WebsiteQueryTool, VideoQueryTool} from './agentTools'
import {ToolNode} from '@langchain/langgraph/prebuilt'
import { rootModel } from './aiModels';
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { HumanMessage, AIMessage, isAIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { AgentSystemPrompt } from '../utils/agentPrompts';

//Create Tools
const tools = [WebsiteQueryTool, VideoQueryTool, getCurrentUserInformation, addNote, addMultipleTasks, addSingleTask, getUsersTasks, getCurrentDate]

//Create Model
const agentModel = rootModel.bindTools(tools)

//Build Nodes
const toolNode = new ToolNode(tools)

async function agentNode(state : typeof MessagesAnnotation.State){
    //TODO: Add Streaming capabilities to the answer

    //TODO: Problem 2: Calling websiteSummarizer and then resending the same information is just duplicating the tokens    

    //TODO: Problem 3: Right now,context is being added into the prompt from frontend directly, we can modify it to add it in backend.
    
    const response = await agentModel.invoke([
        {
            'role':'system',
            'content': AgentSystemPrompt
        },
        ...state.messages
    ]);

    return {
        'messages': [response]
    }
}

function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
    const lastMessage = messages[messages.length - 1] as AIMessage;
  
    if (lastMessage.tool_calls?.length) {
      return "tools";
    }

    return "__end__";
}

//Build Graph
//TODO : You can add a preprocess Node - which checks the context window size
//TODO: You can add a preprocess Node - which transcripts the users audio.
//TODO: You can add a postprocess Node - If we want to conver the response into audio using ElevenLabs
const workflow = new StateGraph(MessagesAnnotation)
.addNode("agent", agentNode)
.addNode("tools", toolNode)
.addEdge("__start__","agent")
.addConditionalEdges("agent", shouldContinue)
.addEdge("tools","agent");


//Compile Graph
export const agent = workflow.compile();
