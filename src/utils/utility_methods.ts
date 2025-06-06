import { MessagesAnnotation } from "@langchain/langgraph";
import {encoding_for_model, TiktokenModel} from "tiktoken";
import { encode } from "gpt-tokenizer";
import { rootModel } from "../services/AI/aiModels";
import { Note } from "./models";

export function patchConsoleLogWithTime() {
  const originalLog = console.log;

  console.log = (...args: any[]) => {
    const now = new Date();
    const formatted =
      now.toLocaleDateString('en-GB') + ' ' +
      now.toLocaleTimeString('en-GB', { hour12: false });
    originalLog(`[${formatted}]`, ...args);
  };
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

//TODO: Token estimation works only for openai and few other models, Re-implement this function to work with all models.
export async function truncateNotesByTokenLimit(notes : Note[], MAX_TOKEN_LIMIT : number) : Promise<{result : string, trimmed : boolean}>{
  let tokenCount = 0
  let selected_objects = []
  let trimmed = false

  for(const note of notes){
    const objString = `Title: ${note.title}\nContent: ${note.content}\nUpdatedAt:${note.createdAt?.toDateString()}`
    const estimatedTokens = estimateTokens(objString, rootModel.model as TiktokenModel)

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


export function logMemory(label: string) {
  const mem = process.memoryUsage()
  const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + 'MB'
  console.log(`[${label}] Memory - RSS: ${mb(mem.rss)}, HeapUsed: ${mb(mem.heapUsed)}, HeapTotal: ${mb(mem.heapTotal)}`)
}

export function estimateTokens(text: string, model? : TiktokenModel): number {
  try {
    return encode(text).length;
  } catch (error) {
    console.error("Error estimating tokens:", error);
    throw error;
  }
}

