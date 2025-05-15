import { ChatOpenAI } from "@langchain/openai";
import { OpenAI, OpenAIEmbedding } from "llamaindex";

//TODO: Give a choice of models to users to choose from
//Can replace with Deepseek model to save costs
//May be we can replace with 4.1-nano as well
export const rootModel =  new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.1,
  apiKey: process.env.OPENAI_API_KEY
}) // LLM Model

export const onBoardingAssistant = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.7,
  apiKey: process.env.OPENAI_API_KEY,
})

//Replace with Deepseek to save costs
export const websiteResearcher = new OpenAI({
  model: 'gpt-4.1-nano',
  apiKey: process.env.OPENAI_API_KEY,
  temperature:0.4
})

//TODO: Can we  use huggingface opensource embeddings models for this purpose?
export const websiteEmbeddingModel = new OpenAIEmbedding({
  model:'text-embedding-3-small',
  apiKey: process.env.OPENAI_API_KEY,
})