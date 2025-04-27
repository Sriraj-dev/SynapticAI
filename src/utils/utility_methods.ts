import { CheerioCrawler, PlaywrightCrawler, RequestQueue } from "crawlee";

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
  