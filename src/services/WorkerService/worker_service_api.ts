import { AppError } from "../../utils/errors"
import { StatusCodes } from "../../utils/statusCodes"


//To Handle the api calls to the worker service
export const WorkerServiceApi = {

    //TODO: This function is not being used currently, as we are fetching the website content directly from this service.
    async fetchWebsiteContent (url : string): Promise<string> {
        try {
            const baseUrl = process.env.WORKER_SERVICE_URL
            if (!baseUrl) throw new AppError('WORKER_SERVICE_URL not set in env', StatusCodes.INTERNAL_SERVER_ERROR)
      
            const response = await fetch(`${baseUrl}/crawler/crawl-website?url=${encodeURIComponent(url)}`)
      
            if (!response.ok) {
              throw new Error(`Worker service responded with ${response.status}`)
            }
      
            const data = await response.json()
            console.log(`Worker service responded with content: ${data.content}`)
            return data.content || ''
        } catch (err) {
            throw new AppError(`Failed to fetch content from worker service ${err}`, StatusCodes.INTERNAL_SERVER_ERROR)
        }
    }
}