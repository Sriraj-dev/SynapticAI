import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { users , notes, tasks, noteAccess, userUsageMetrics, subscriptions, SubscriptionTier} from "../db/schema";
import { semanticNotes } from "../db/vectordb_schema";

//Users
export type NewUser = InferInsertModel<typeof users>;
export type User = InferSelectModel<typeof users>;

//Notes
export type NewNote = InferInsertModel<typeof notes>;
export type Note = InferSelectModel<typeof notes>;

//Semantics
export type NewSemanticNote = InferInsertModel<typeof semanticNotes>
export type SemanticNote = InferSelectModel<typeof semanticNotes>
export type SemanticSearchResponse = {
    similarity: number
    content: string, 
    note_id: string,
    chunk_index: number,
    total_chunks: number, 
}

//Tasks
export type NewTask = InferInsertModel<typeof tasks>
export type Task = InferSelectModel<typeof tasks>

//NoteAccess
export type NewNoteAccess = InferInsertModel<typeof noteAccess>
export type NoteAccess = InferSelectModel<typeof noteAccess>

//UsageMetrics
export type NewUserUsageMetrics = InferInsertModel<typeof userUsageMetrics>
export type UserUsageMetrics = InferSelectModel<typeof userUsageMetrics>

//UserSubscriptions
export type NewUserSubscription = InferInsertModel<typeof subscriptions>
export type UserSubscription = InferSelectModel<typeof subscriptions>

type UsageLimits = {
    embedded_tokens_limit: number;
    daily_chat_tokens_limit: number;
    daily_voice_tokens_limit: number;
    daily_internet_calls_limit: number;
    daily_semantic_queries_limit: number;
  };
  
  export const SubscriptionLimits: Record<SubscriptionTier, UsageLimits> = {
    [SubscriptionTier.Basic]: {
      embedded_tokens_limit: 10000,
      daily_chat_tokens_limit: 5000,
      daily_voice_tokens_limit: 200,
      daily_internet_calls_limit: 5,
      daily_semantic_queries_limit: 20,
    },
    [SubscriptionTier.Advanced]: {
      embedded_tokens_limit: 50000,
      daily_chat_tokens_limit: 50000,
      daily_voice_tokens_limit: 2000,
      daily_internet_calls_limit: 15,
      daily_semantic_queries_limit: 60,
    },
    [SubscriptionTier.Elite]: {
      embedded_tokens_limit: 500000,
      daily_chat_tokens_limit: 500000,
      daily_voice_tokens_limit: 100,
      daily_internet_calls_limit: 50,
      daily_semantic_queries_limit: 200,
    },
};
