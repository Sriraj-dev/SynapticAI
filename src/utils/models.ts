import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { users , notes, tasks, noteAccess} from "../db/schema";

//Users
export type NewUser = InferInsertModel<typeof users>;
export type User = InferSelectModel<typeof users>;

//Notes
export type NewNote = InferInsertModel<typeof notes>;
export type Note = InferSelectModel<typeof notes>;

//Tasks
export type NewTask = InferInsertModel<typeof tasks>
export type Task = InferSelectModel<typeof tasks>

//NoteAccess
export type NewNoteAccess = InferInsertModel<typeof noteAccess>
export type NoteAccess = InferSelectModel<typeof noteAccess>
