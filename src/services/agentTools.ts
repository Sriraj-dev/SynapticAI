
// src/tools/getCurrentDate.ts
import { DynamicStructuredTool } from 'langchain/tools'
import { z } from 'zod'
import { UserController } from '../controllers/user.controller';
import { NotesController } from '../controllers/notes.controller';
import { NewTaskRequest, NoteCreateRequest } from '../utils/apiModels/requestModels';
import { TaskController } from '../controllers/tasks.controller';
import { LRUCache } from "lru-cache";
import {VectorStoreIndex, SummaryIndex, Settings, Document, getResponseSynthesizer} from 'llamaindex'
import { websiteEmbeddingModel, websiteResearcher } from './aiModels';
import { WebSiteAgentSummaryPrompt, WebsiteAgentQAPrompt} from '../utils/agentPrompts'
import { getWebsiteContent } from '../utils/utility_methods';
import {YoutubeTranscript} from 'youtube-transcript'

// Cache to store the websites content, to avoid frequent scraping 
//TODO: Use Storage like Redis for this purpose as we anyhow have to use it for background tasks as well
const websiteDataCache = new LRUCache<string, { vectorIndex: VectorStoreIndex; summaryIndex: SummaryIndex }>({
  max: 100, // Max 100 sessions
  ttl: 3600 * 1000, // 1 hour TTL
});

//Settings for LlamaIndex
Settings.llm = websiteResearcher
Settings.embedModel = websiteEmbeddingModel
Settings.chunkSize = 1000
Settings.chunkOverlap = 200

const qaResponseSynthesizer = getResponseSynthesizer('compact', {
  textQATemplate: WebsiteAgentQAPrompt
})

const summaryResponseSynthesizer = getResponseSynthesizer('compact', {
  textQATemplate: WebSiteAgentSummaryPrompt
})

export const getCurrentDate = new DynamicStructuredTool({
  name: 'get_current_date',
  description: 'Returns current ISO date',
  schema: z.object({}),
  func: async () => new Date().toISOString(),
})

export const getCurrentUserInformation = new DynamicStructuredTool({
  func: async ({userMessage}, _runManager, context) => {
    const userId = context?.configurable?.userId
    try{
      const user = await UserController.getUser(userId)
      
      console.log("User Found: ", user?.name)
      return JSON.stringify(user);
    }catch(err){
      console.log(err)
      return "Unable to fetch the user Information";
    }

  },
  name: 'get_current_user_information',
  description: 'Returns all the information about the user that is shared with SynapticAI',
  schema: z.object({
    userMessage: z.string().optional().describe("This is a complete optional message but suggested to use, while this tool is getting executed you can send a short engaging messaging to user")
  }),
})

export const addNote = new DynamicStructuredTool({
  func: async ({title, content, userMessage}, _runManager, context) => {
    
    const userId = context?.configurable?.userId
    try{
      const newNote = {
        title: title,
        content: content,
      } as NoteCreateRequest

       (async () => {
        try {
          await NotesController.createNote(userId, newNote);
        } catch (err) {
          console.error("Note creation failed in background:", err);
          //TODO: Log it somewhere, to monitor the background tasks
        }
      })();

      return `Note creation is under process. Have a great learning, Thanks!`
    }catch(err){
      return "Sorry, Unable to add the notes into users memory, Try again later!"
    }
  },

  name: 'add_note',
  description: 'Adds a note to the database',
  schema: z.object({
    content: z.string().describe('The content of the note to be added to the database'),
    title :z.string().optional().describe('The title(optional) of the note'),
    userMessage: z.string().optional().describe("This is a complete optional message, while this tool is getting executed you can send a short engaging messaging to user")
  }),
})

export const addMultipleTasks = new DynamicStructuredTool({
  func: async ({tasks,userMessage}, _runManager, context) => {
    const userId = context?.configurable?.userId
    try{
      const user = await UserController.getUser(userId)

      const newTasks = tasks.map((task) => ({
        title: task.title,
        content: task.content ?? "",
        owner_id: userId,
      } as NewTaskRequest));

      // Offload task creation to background (non-blocking), later we can add worked threads to handle these jobs
      Promise.all(
        newTasks.map((task) => TaskController.addTask(task))
      ).catch((err) => {
        console.error("Background task creation failed:", err);
        //TODO: Log it somewhere to monitor all the background processes
      });

      return "All the tasks will be added to your dashboard, I know you can do this!";

    }catch(err){
      console.log(err)
      return "Sorry, Could not add tasks to your dashboard, Try again later!";
    }

  },
  name: 'add_multiple_tasks',
  description: 'Adds a list of tasks to the user, which user can view/modify from dashboard',
  schema: z.object({
    tasks : z.array(
      z.object(
        {
          title:z.string().describe("The title of task, which describes what to do"), 
          content:z.string().optional().describe("An optional content section for the task which describes what exactly needs to be done in a tasl")
        })
      ).describe('The list of tasks to be added to the user'),
    userMessage: z.string().optional().describe("This is a complete optional message, while this tool is getting executed you can send a short engaging messaging to user")
  }),
})

export const addSingleTask = new DynamicStructuredTool({
  func: async ({title, content,userMessage}, _runManager, context) => {
    const userId = context?.configurable?.userId
    try{
      const newTask = {
        title: title,
        content: content,
        owner_id: userId,
      } as NewTaskRequest

      TaskController.addTask(newTask).then(()=>{
        console.log("New task created for user - ", userId)
      }).catch(
        (err)=>{
          //TODO: Monitor the background tasks
          console.log("Error in creating new task for user - ", userId)
          console.log(err)
        }
      )

      return `Task creation is under process. Hope you will finish it soon!`
    }catch(err){
      return "Sorry, Unable to add the task into users memory, Try again later!"
    }
  },
  name: 'add_single_task',
  description: 'Adds a single task to the user, which user can view/modify from dashboard',
  schema: z.object({
    title: z.string().describe('The title of task, which describes what to do'),
    content: z.string().optional().describe('An optional content section for the task which describes what exactly needs to be done in a tasl'),
    userMessage: z.string().optional().describe("This is a complete optional message, while this tool is getting executed you can send a short engaging messaging to user")
  }),
})

export const getUsersTasks = new DynamicStructuredTool({
  func: async ({userMessage}, _runManager, context) => {
    const userId = context?.configurable?.userId
    try{
      const tasks = await TaskController.getTasks(userId)

      return JSON.stringify(tasks)
    }catch(err){
      return "Sorry, Unable to fetch the tasks, Try again later!"
    }
  },
  name: 'get_users_tasks',
  description: 'Returns all the tasks that user has created',
  schema: z.object({
    userMessage: z.string().optional().describe("This is a complete optional message but suggested to use, while this tool is getting executed you can send a short engaging messaging to user")
  }),
})


export const WebsiteQueryTool = new DynamicStructuredTool({
  func: async ({userQuery, isSummary = true, userMessage}, _runManager, context) => {

    const url = context?.configurable?.url
    console.log(url)

    if(!url) return "Sorry, Unable to fetch the website url from browser, can you send me the web url on which you want to perform the action ?"

    let vectorIndex: VectorStoreIndex;
    let summaryIndex: SummaryIndex;

    try{
      // Load the vector index from LRU cache if exists, query on index and return the anwer
      if (websiteDataCache.has(url)) {
        console.log("Using cached data for URL:", url);
        ({ vectorIndex, summaryIndex } = websiteDataCache.get(url)!);
      }else{
        console.log(`Could not fetch ${url} from cache`)
        // Use crawlee to get the websites content .
        const content = await getWebsiteContent(url);
        if(content.length == 0){
          return "Sorry, Unable to fetch the content of the website, You can highlight the text on your browser and ask your query, I will be happy to answer"
        }
  
        //Create Documents from the website content
        const document = new Document({ text: content ,metadata: {url}});
  
        // Create vector index and store it in cache
        vectorIndex = await VectorStoreIndex.fromDocuments([document]);
        summaryIndex = await SummaryIndex.fromDocuments([document]);
  
        websiteDataCache.set(url, { vectorIndex, summaryIndex })
      }

      // Query on vector index and return the answer
      if(isSummary){
        const summary = await summaryIndex
        .asQueryEngine({responseSynthesizer: summaryResponseSynthesizer})
        .query({ query: userQuery??"Summarise the content of this website in 100-300 words" });
        return summary.message.content
      }else{
        const answer = await vectorIndex.asQueryEngine
        ({responseSynthesizer:qaResponseSynthesizer})
        .query({ query: userQuery?? ""});
        return answer.message.content
      }

    }catch(err){
      console.error(err)
      return "Sorry, Unable to fetch the content of the website, You can highlight the text on your browser and ask your query, I will be happy to answer"
    }
  },
  name: 'website_query_tool',
  description: `Use this tool to summarize or answer questions about the website the user is currently viewing. 

  You do NOT need to ask the user for the website URL — the URL is already available which is picked up from the users browser.

Trigger this tool when the user asks anything like:
- "Can you summarize this website?"
- "What is this page about?"
- "Can you explain what's going on here?"
- "What does this paragraph mean?"
- Or any general or specific question about the current webpage.
Do not use this tool for unrelated or non-website queries.`,
  schema: z.object({
    userQuery: z.string().optional().describe("The user's request about the website, provided via the URL in the configuration. Use this for summarization requests (e.g., 'Summarize this website' or 'What is this website about?') or specific questions about the website’s content (e.g., 'What is the history section on this page?'). If empty, a default summary is generated."),
    isSummary: z.boolean().optional().default(true).describe('Whether to summarise (short or long) the website or answer any questions. If true, the tool will summarise the website. If false, the tool will answer any questions on the website. Default is true.'),
    userMessage: z.string().optional().describe("This is an optional message but suggested to use, while this tool is getting executed you can send a short engaging messaging to user")
  }),
})

export const VideoQueryTool = new DynamicStructuredTool({
  func: async ({videoUrl,userQuery, isSummary, userMessage}, _runManager, context) => {
    
    let url = context?.configurable?.url
    if(videoUrl && videoUrl.length!=0)
      url = videoUrl

    if(!url.includes("youtube.com")) 
      return "Apologies, but currently our service only supports YouTube videos. Our development team is actively working to expand this functionality. We appreciate your patience and apologize for any inconvenience."

    if(!url.includes("v="))
      return "Apologies, but we couldn't identify the specific video you're referring to. Please ensure the URL contains a valid video reference (e.g., 'v=' parameter)."

    const videoId = url.split('v=')[1].split('&')[0];
    let vectorIndex : VectorStoreIndex;
    let summaryIndex : SummaryIndex;

    try{
      if(websiteDataCache.has(url)){
        ({vectorIndex, summaryIndex} = websiteDataCache.get(url)!)
        console.log("Using cached data for videoId:", url);
      }else{
          console.log("Cached data not available for this video")
          const transcript = await YoutubeTranscript.fetchTranscript(videoId)
          const videoTranscript = transcript.map((item) => item.text).join(' ');

          if(!videoTranscript || videoTranscript.length == 0){
            //TODO : If couldnt find the transcript, get the videos audio and get transcript from whisper model
            return "Apologies, we couldn't retrieve the transcript for this video. The video may not have captions available, or an unexpected error occurred."
          }

          const document = new Document({ text: videoTranscript, metadata: {url}});

          // Create vector index and store it in cache
          vectorIndex = await VectorStoreIndex.fromDocuments([document]);
          summaryIndex = await SummaryIndex.fromDocuments([document]);

          websiteDataCache.set(url, {vectorIndex, summaryIndex})
        }

        if(isSummary){
          const summary = await summaryIndex
          .asQueryEngine({responseSynthesizer: summaryResponseSynthesizer})
          .query({ query: userQuery??"Summarise the content of this video in 100-300 words" });
          return summary.message.content
        }else{
          const answer = await vectorIndex.asQueryEngine
          ({responseSynthesizer:qaResponseSynthesizer})
          .query({ query: userQuery?? ""});
          return answer.message.content
        }
    }
    catch(err){
      console.log(err)
      return "Apologies, Im not able to understand the context of this video. Sorry for the inconvinence"
    }

  },
  name: 'video_query_tool',
  description: `Use this tool to answer questions about the video the user is currently viewing.

  You do NOT need to ask the user for the video url — the url is already available which is picked up from the users browser.

Trigger this tool when the user asks anything like:
- "Can you summarize this video?"
- "What is this video about?"
- "Can you explain what's going on here?"
- "What does this video mean?"
- Or any general or specific question about the current video.
Do not use this tool for unrelated or non-video queries.`,
  schema: z.object({
    videoUrl: z.string().optional().describe("Optional parameter, if the user specifically mentions any video url"),
    userQuery: z.string().optional().describe("The user's request about the video. Use this for summarization requests (e.g., 'Summarize this video' or 'What is this video about?') or specific questions about the video’s content (e.g., 'What is the history section on this video?'). If empty, a default summary is generated."),
    isSummary: z.boolean().optional().default(true).describe('Whether to summarise (short or long) the video or answer any questions. If true, the tool will summarise the video. If false, the tool will answer any questions on the video. Default is true.'),
    userMessage: z.string().optional().describe("This is an optional message but suggested to use, while this tool is getting executed you can send a engaging messaging to user")
  }),
})

