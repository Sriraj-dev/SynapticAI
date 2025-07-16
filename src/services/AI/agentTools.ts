
// src/tools/getCurrentDate.ts
import { DynamicStructuredTool } from 'langchain/tools'
import { z } from 'zod'
import { UserController } from '../../controllers/user.controller';
import { NotesController } from '../../controllers/notes.controller';
import { NewTaskRequest, NoteCreateRequest } from '../../utils/apiModels/requestModels';
import { TaskController } from '../../controllers/tasks.controller';
import { LRUCache } from "lru-cache";
import {VectorStoreIndex, SummaryIndex, Settings, Document, getResponseSynthesizer} from 'llamaindex'
import { MAX_TOKENS_PER_TOOL, websiteEmbeddingModel, websiteResearcher } from './aiModels';
import { WebSiteAgentSummaryPrompt, WebsiteAgentQAPrompt} from './agentPrompts'
import { logMemory, truncateNotesByTokenLimit } from '../../utils/utility_methods';
import * as cheerio from "cheerio";
import { Note } from '../../utils/models';
import puppeteer, { Browser } from 'puppeteer';
import {TavilySearch} from "@langchain/tavily"
import { fetchTranscriptFromPublicAPI } from '../../utils/yt_transcript_utils';

// Cache to store the websites content, to avoid frequent scraping 
//TODO: Figure out how to store this in redis like storage 
//This might cause memory bloats on server
const websiteDataCache = new LRUCache<string, { vectorIndex: VectorStoreIndex; summaryIndex: SummaryIndex }>({
  max: 100, // Max 100 sessions
  ttl: 1800 * 1000, // 30 Mins TTL
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


export const InternetSearchTool =new DynamicStructuredTool({
  name: 'internet_search',
  description: 'Use this tool to search the internet for up-to-date information when the user asks something that requires real-time or external knowledge. It fetches relevant search results using the Tavily Search API.',
  schema: z.object({
    searchQuery: z.string().describe(
      'The user question or search phrase to look up on the internet. Should reflect what the user is trying to find or understand.'
    ),
    userMessage: z.string().describe(
      'A short, friendly message shown to the user while waiting for internet search results. Since it may take a few seconds, aim to keep the user engaged, reassured, or even slightly entertained to encourage patience & mention that this search is going to take a little while'
    )
  }),
  responseFormat: "content_and_artifact",

  func: async ({searchQuery, userMessage}, _runManager, context) => {
    try{

      const tavilytTool = new TavilySearch({
        maxResults: 3,
        includeAnswer:true,
        searchDepth: "advanced"
      })

      const searchResults = await tavilytTool.invoke({ query: searchQuery });

      const content = searchResults.results.map((result : any) => result.content).join('\n\n');
      const answer = searchResults.answer
      const links = searchResults.results.map((result : any) => result.url);
      console.log("Answer Retreived : " , searchResults)
      console.log("Links Retreived : " , links)

      const finalResponse = `Short Answer: ${answer} \nSome Relavant Content: ${content}`

      return [finalResponse, links]
    }catch(err){
      console.error("Error in Internet Search Tool:", err);
      return "Sorry, I encountered an error while trying to search the internet. Please try again later.";
    }
  }
})

export const getCurrentUserInformation = new DynamicStructuredTool({
  func: async ({userMessage}, _runManager, context) => {
    const userId = context?.configurable?.userId
    try{
      const user = await UserController.getUser(userId)
      
      console.log("User Found: ", user?.name)
      return {
        name: user?.name,
        email: user?.email,
        phone: user?.phone,
        username: user?.username,
        subscription_tier: user?.subscription_tier,
        subscription_end_date: user?.subscription_end_date,
        subscription_start_date: user?.subscription_start_date,
        amount_paid_to_synapticAI : user?.amount_paid,
      };
    }catch(err){
      console.log(err)
      return "Unable to fetch the user Information";
    }

  },
  name: 'get_current_user_information',
  description: `You can use this tool to fetch details about the user. Returns the user's profile information and subscription details saved in SynapticAI, including name, email, username, subscription status, and total amount paid.`,
  schema: z.object({
    userMessage: z.string().describe("message to keep the user engaged while this tool runs (e.g., 'Please Wait, Fetching your profile...')")
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

      setTimeout(() => {
        NotesController.createNote(userId, newNote).catch((err) => {
          console.error("❌ Note creation failed in background:", err);
        });
      }, 0);

      return `Note creation is under process. Have a great learning, Thanks!`
    }catch(err){
      return "Sorry, Unable to add the notes into users memory, Try again later!"
    }
  },

  name: 'add_note',
  description: 'Adds a note to the database',
  schema: z.object({
    content: z.string().describe('The content of the note to be added to the database'),
    title :z.string().describe('The title of the note'),
    userMessage: z.string().describe("Message to keep the user engaged while this tool runs")
  }),
})

export const addTasks = new DynamicStructuredTool({
  func: async ({tasks,userMessage}, _runManager, context) => {
    const userId = context?.configurable?.userId
    try{
      const user = await UserController.getUser(userId)

      const newTasks = tasks.map((task) => ({
        title: task.title,
        content: task.content ?? "",
        owner_id: userId,
      } as NewTaskRequest));

      Promise.all(
        newTasks.map((task) => TaskController.addTask(task))
      ).catch((err) => {
        console.error("❌ Background task creation failed:", err);
      });
      

      return "All the tasks will be added to your dashboard, Best of Luck!";

    }catch(err){
      console.log(err)
      return "Sorry, Could not add tasks to your dashboard, Try again later!";
    }

  },
  name: 'add_tasks',
  description: 'Adds a list of tasks to the user, which user can view/modify from dashboard',
  schema: z.object({
    tasks : z.array(
      z.object(
        {
          title:z.string().describe("The title of task, which describes what to do"), 
          content:z.string().optional().describe("An optional content section for the task which describes what exactly needs to be done in a tasl")
        })
      ).describe('The list of tasks to be added to the user'),
    userMessage: z.string().describe("Message to keep the user engaged while this tool runs")
  }),
})

export const getUsersTasks = new DynamicStructuredTool({
  func: async ({userMessage}, _runManager, context) => {
    try{
      const userId = context?.configurable?.userId
      const tasks = await TaskController.getTasks(userId)

      const parsedTasks = tasks.map((task, index) => (`Task ${index+1}:\nTitle: ${task.title}\nContent: ${task.content}\nStatus: ${task.status}\nTime_Logged: ${task.time_logged}\n`)).join('\n')

      return parsedTasks
    }catch(err){
      return "Sorry, Unable to fetch the tasks, Try again later!"
    }
  },
  name: 'get_users_tasks',
  description: 'Returns all the tasks that user has created',
  schema: z.object({
    userMessage: z.string().describe("Message to keep the user engaged while this tool runs")
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

        //TODO: In Future, May be we can use worker service to fetch the website content if that optimises the performance
        // const content = await WorkerServiceApi.fetchWebsiteContent(url)
        const content = await getWebsiteContent(url)
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
  description: `Use this tool to interact with the content of the website the user is currently viewing.
It can either generate a full summary of the page or answer specific questions based on the content, 
depending on the intent and the 'isSummary' flag.`,
  schema: z.object({
    url: z.string().optional().describe("The URL of the website the user is currently browsing. This is optional because tool already has access to the users currently browsing URL"),
    userQuery: z.string().describe(`The user's natural language request about the website. 
      Examples:
      - "Summarize this page"
      - "What does this section mean?"
      - "Explain the pricing details"
      - "Give me 3 key takeaways from this article"`),
    isSummary: z.boolean().describe(`Set to true if the user's intent is to generate a full summary of the website.
Set to false if the user is asking a specific question that requires contextual understanding of certain parts of the page.`),
    userMessage: z.string().optional().describe("Message to keep the user engaged while this tool runs")
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
    console.log("Video Id:", videoId);
    let vectorIndex : VectorStoreIndex;
    let summaryIndex : SummaryIndex;

    try{
      if(websiteDataCache.has(url)){
        ({vectorIndex, summaryIndex} = websiteDataCache.get(url)!)
        console.log("Using cached data for videoId:", url);
      }else{
          console.log("Cached data not available for this video")
          const videoTranscript = await fetchTranscriptFromPublicAPI(videoId);

          
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
  description: `Use this tool to interact with the content of the video the user is currently watching.
It can either generate a full summary of the video or answer specific questions based on the transcript,
depending on the user's intent and the 'isSummary' flag.`,
  schema: z.object({
    videoUrl: z.string().optional().describe("The URL of the video the user is currently watching/browsing. This is optional because tool already has access to the users currently watching video URL."),
    userQuery: z.string().describe(`The user's natural language request about the video content. 
      Examples:
      - "Summarize this video"
      - "What is the main idea here?"
      - "Explain what the speaker said about inflation"
      - "What are the key points from this lecture?"`),
    isSummary: z.boolean().describe(`Set to true if the user is asking for a complete summary of the video.
      Set to false if the user is asking a specific question that refers to a particular part or topic within the video.`),
    userMessage: z.string().optional().describe("Message to keep the user engaged while this tool runs")
  }),
})

export const SemanticNoteSearchTool = new DynamicStructuredTool({
  name : 'semantic_note_search',
  description: "Searches for the most relevant note chunks from the user's past notes using vector similarity based on the current query. Use this to recall knowledge or assist the user based on previous learnings.",
  schema: z.object({
    query: z.string().describe('The natural language query used to find semantically similar notes from their past saved notes using vector similarity search.'),
    userMessage: z.string().describe("Message to keep the user engaged while this tool runs")
  }),
  responseFormat: "content_and_artifact",

  func: async ({query, userMessage}, _runManager, context) => {
    try{
      const userId = context?.configurable?.userId

      const semanticNotes = await NotesController.getSemanticNoteChunks(query, userId)
      console.log("Querying Vector Database : ", query)

      const parsedResponse = semanticNotes
      .sort((a, b) => b.similarity - a.similarity)
      .map((note) => (`[\nSimilarity: ${note.similarity.toFixed(2)} %\nNote_Chunk: ${note.content}\nNote ID: ${note.note_id}\n]`));

      const artifacts = Array.from(
        new Map(semanticNotes.map(note => [note.note_id, note])).values()
      ).map(note => ({
        url: note.note_id,
        content: note.content,
      }));

      return [parsedResponse.join('\n'), artifacts]
    }catch(err){
      return "Sorry, Facing Technical Difficulties while searching for notes. Please try again later."
    }
  }
})

export const GetNotesByDateRangeTool =  new DynamicStructuredTool({
  func: async ({startDate, endDate, userMessage}, _runManager, context) => {

    try{
      const userId = context?.configurable?.userId
      console.log(`Fetching Users tasks from the ${startDate} to ${endDate}`)
      const notes = await NotesController.getNotesByDateRange(new Date(`${startDate}T00:00:00Z`) , new Date(`${endDate}T23:59:59.999Z`), userId)

      const notesContent = notes
      .sort((a, b) => {
        const dateA = a.updatedAt ? a.updatedAt.getTime() : 0;
        const dateB = b.updatedAt ? b.updatedAt.getTime() : 0;
        return dateB - dateA;
      })
      .map(note => ({
        title: note.title ?? "N/A",
        content: note.content,
        createdAt: note.updatedAt ?? "Unknown"
      } as Note));   
      
      const {result,trimmed} = await truncateNotesByTokenLimit(notesContent, MAX_TOKENS_PER_TOOL)
      
      const additionalMessage = trimmed
      ? "\n\nNote: The notes provided here represent only a subset of the full set within the requested date range due to token limitations. If more context is needed, consider requesting a narrower range"
      : "";

      return result + additionalMessage

    }catch(err){
      return "Sorry, Unable to fetch your notes, Try again later!"
    }
  },

  name: 'get_notes_by_date_range',
  description: `Fetches all notes created by the user between the given start and end dates (inclusive). Use this to access past learning, recall memory, or retrieve context.
  NOTE: You have a tool to get current date (getCurrentDate), You can use it accordingly to get the start and end date of the range.
  `,

  schema: z.object({
    startDate: z.string().describe("The start date of the range in YYYY-MM-DD format"),
    endDate: z.string().describe("The end date of the range in YYYY-MM-DD format"),
    userMessage: z.string().describe("Message to keep the user engaged while this tool runs")
  }),

})


//TODO: If required, add a tool to fetch note by noteId.


//#region Private Methods
let browser: Browser | null = null;

async function getOrCreateBrowser(): Promise<Browser> {
  if (browser) return browser;
  logMemory("Before Puppeteer Launch");
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  process.on('exit', async () => {
    if (browser) await browser.close();
  });

  logMemory("After Puppeteer Launch");
  return browser;
}

export async function getWebsiteContent(url: string) {
    let content = '';

    try {
      const res = await fetch(url);
      const html = await res.text();
      const $ = cheerio.load(html);
      $('script, style, nav, header, footer, iframe, noscript').remove();
      content = $('body').text().replace(/\s+/g, ' ').trim();
      console.log("Cheerio (CSR) content fetched successfully");

      return content;
    } catch (err) {
      console.error('Cheerio failed, Falling back to Puppeteer:', err);
    }

    try {
      const browser = await getOrCreateBrowser();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 8000 });
  
      content = await page.evaluate(() => {
        document.querySelectorAll("script, style, nav, header, footer, iframe, noscript").forEach(el => el.remove());
        return document.body.innerText.replace(/\s+/g, ' ').trim();
      });
  
      await page.close();
      console.log("Puppeteer (SSR) content fetched successfully");
      return content;
    } catch (err) {
      console.warn('Puppeteer also failed', err);
      return '';
    }
}

//#endregion