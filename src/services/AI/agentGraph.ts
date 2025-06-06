/*
This agent graph is stateless and pre compiled which can be invoked using agentState as required.
*/
import "../../config/env"
import { getCurrentDate, getCurrentUserInformation, addNote, addTasks, getUsersTasks, WebsiteQueryTool, VideoQueryTool, SemanticNoteSearchTool, GetNotesByDateRangeTool, InternetSearchTool} from './agentTools'
import {ToolNode} from '@langchain/langgraph/prebuilt'
import { rootModel } from './aiModels';
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import {  AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentSystemPrompt } from './agentPrompts';

//Create Tools
const tools = [InternetSearchTool,SemanticNoteSearchTool, GetNotesByDateRangeTool, WebsiteQueryTool, VideoQueryTool, getCurrentUserInformation, addNote, addTasks, getUsersTasks, getCurrentDate]

//Create Model
const agentModel = rootModel.bindTools(tools)

//Build Nodes
const toolNode = new ToolNode(tools)

//TODO: I guess, website/video query tools are not optimised properly for follow-up chatting. Might need to modify the structure to handle websiteQuerying & VideoQuerying more efficiently.

//TODO: Problem 2: Calling websiteSummarizer and then resending the same information is just duplicating the tokens    
async function agentNode(state : typeof MessagesAnnotation.State, config : any){
    
    const usersWebUrl = config["configurable"]["url"] || "Unknown Url"
    const usersHighlightedText = config["configurable"]["context"] || ""

    const contexualSystemPrompt = `
            ${AgentSystemPrompt}

            The user is currently browsing (url): ${usersWebUrl}
            Users Highlighted Text (if any): ${usersHighlightedText}

            You can use this information to guide your response.
        `

    const response = await agentModel.invoke([
        {
            'role':'system',
            'content': contexualSystemPrompt
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
const workflow = new StateGraph(MessagesAnnotation)
.addNode("agent", agentNode)
.addNode("tools", toolNode)
.addEdge("__start__","agent")
.addConditionalEdges("agent", shouldContinue)
.addEdge("tools","agent");


//Compile Graph
export const agent = workflow.compile();
