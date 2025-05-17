import { MessagesAnnotation } from "@langchain/langgraph";
import { CheerioCrawler, PlaywrightCrawler, RequestQueue } from "crawlee";
import { rootModel } from "../services/aiModels";
import { AIMessage, BaseMessage, HumanMessage, isHumanMessage, ToolMessage } from "@langchain/core/messages";

//TODO: This needs chromium browser to be installed on the server.
export async function getWebsiteContent(url: string) {
    let content = '';
    const requestQueue = await RequestQueue.open();
  
    await requestQueue.addRequest({ url: url });
    
    const playwrightCrawler = new PlaywrightCrawler({
      requestQueue,
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
  
  // const recentMessages = await trimMessages(messages,{
  //   maxTokens : 300,
  //   strategy: "last",
  //   tokenCounter: rootModel,
  // })

  // return recentMessages
}