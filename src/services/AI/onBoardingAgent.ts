import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages"
import { onBoardingAssistant } from "./aiModels"
import { AppError } from "../../utils/errors";
import { StatusCodes } from "../../utils/statusCodes";



export class OnBoardingAgent {
    private systemMessage : SystemMessage | null;
    private messages : BaseMessage[] | null;

    constructor(systemPrompt : string){
        this.messages = []
        this.systemMessage = new SystemMessage(systemPrompt)
    }

    async invoke(userMessage : string, onChunk?: (chunk : string) => void) : Promise<string>{
        if(this.systemMessage && this.messages){
            const newMessage = new HumanMessage(userMessage)
            this.messages.push(newMessage)

            const stream = await onBoardingAssistant.stream([this.systemMessage, ...this.messages])

            let response = ""

            for await(const chunk of stream){
                const text = chunk.content?.toString() || ""
                response = `${response}${text}`

                if(onChunk && text.trim() !== ""){
                    onChunk(text)
                }
            }
            
            this.messages.push(new AIMessage(response))

            return response
        }else{
            throw new AppError("System Message not set", StatusCodes.INTERNAL_SERVER_ERROR)
        }
    }

}