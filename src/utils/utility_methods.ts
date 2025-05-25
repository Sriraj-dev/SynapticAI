import { MessagesAnnotation } from "@langchain/langgraph";
import { CheerioCrawler, PlaywrightCrawler, RequestQueue } from "crawlee";
import {encoding_for_model, TiktokenModel} from "tiktoken";
import { rootModel } from "../services/aiModels";
import { Note } from "./models";

//TODO: This needs chromium browser to be installed on the server.
export async function getWebsiteContent(url: string) {
    let content = '';
    const requestQueue = await RequestQueue.open();
  
    await requestQueue.addRequest({ url: url });
    
    const playwrightCrawler = new PlaywrightCrawler({
      requestQueue,
      launchContext: {
        launchOptions: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
      async requestHandler({ page }) {
        console.log("Scraping : ", page.url())
        await page.waitForLoadState('networkidle'); // Wait for dynamic content
        content = await page.evaluate(() => {
          document.querySelectorAll("script, style, nav, header, footer, iframe, noscript").forEach(el => el.remove());
          return document.body.innerText.replace(/\s+/g, " ").trim();
        });
      },
      requestHandlerTimeoutSecs: 15,
    });
  
    try {
      await playwrightCrawler.run();
      return content;
    } catch (error) {
      console.warn('Playwright failed, falling back to Cheerio (SSR):', error);
    }
  
    if(requestQueue.getTotalCount() == 0){
      requestQueue.addRequest({ url: url });
    }
  
    const cheerioCrawler = new CheerioCrawler({
      requestQueue,
      async requestHandler({ $ }) {
        $('script, style, nav, header, footer, iframe, noscript').remove();
        const rawText = $('body').text();
        content = rawText.replace(/\s+/g, " ").trim();
      },
    });
    
    try{
      await cheerioCrawler.run();
      return content;
    }catch(err){
      console.error(err)
      return ''
    }
}
  

export async function preprocessAgentContext({ messages } : typeof MessagesAnnotation.State){

  //TODO: If required, Modify this function in the following scenarios : 
  // 1. Cost is increasing to handle chat messages
  // 2. Agent is not able to perform well due to lack of context.
  const recentMessages = []
  let conv_count_req = 8

  for(let i = messages.length - 1; i >= 0; i--){
    const message = messages[i]

    if(conv_count_req > 0) recentMessages.unshift(message)
    else break

    if(message.id?.includes("HumanMessage")) conv_count_req -=1
  }

  return recentMessages
}


export async function truncateNotesByTokenLimit(notes : Note[], MAX_TOKEN_LIMIT : number) : Promise<{result : string, trimmed : boolean}>{
  let tokenCount = 0
  let selected_objects = []
  let trimmed = false

  for(const note of notes){
    const objString = `Title: ${note.title}\nContent: ${note.content}\nUpdatedAt:${note.createdAt?.toDateString()}`
    const estimatedTokens = await estimateTokens(objString, rootModel.model as TiktokenModel)

    if(tokenCount + estimatedTokens > MAX_TOKEN_LIMIT){
      trimmed = true
      break;
    }
    tokenCount += estimatedTokens


    selected_objects.push(objString)
  }

  return {
    result : selected_objects.join("\n\n"),
    trimmed
  }
}


async function estimateTokens(text: string, model : TiktokenModel): Promise<number> {
  try {
    const encoding = encoding_for_model(model);
    const encoded = encoding.encode(text);
    encoding.free();

    return encoded.length;
  } catch (error) {
    console.error("Error estimating tokens:", error);
    throw error;
  }
}

