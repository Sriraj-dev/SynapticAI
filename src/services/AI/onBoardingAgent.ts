import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages"
import { onBoardingAssistant } from "../aiModels"
import { AppError } from "../../utils/errors";
import { StatusCodes } from "../../utils/statusCodes";



export class OnBoardingAgent {
    private systemMessage : SystemMessage | null;
    private messages : BaseMessage[] | null;

    constructor(systemPrompt : string){
        this.messages = []
        this.systemMessage = new SystemMessage(systemPrompt)
    }

    async invoke(userMessage : string){
        if(this.systemMessage && this.messages){
            const newMessage = new HumanMessage(userMessage)
            this.messages.push(newMessage)

            const response = await onBoardingAssistant.invoke([this.systemMessage, ...this.messages])
            this.messages.push(response)
    
            return response.content.toString()
        }else{
            throw new AppError("System Message not set", StatusCodes.INTERNAL_SERVER_ERROR)
        }
    }

}