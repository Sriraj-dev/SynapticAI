import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { users , notes, tasks, noteAccess} from "../db/schema";
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
