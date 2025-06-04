
// export type JobQueue = "create-note-semantics" | "update-note-semantics" | "delete-note-semantics"

export enum JobQueue {
    CREATE_SEMANTICS = "create-note-semantics",
    UPDATE_SEMANTICS = "update-note-semantics",
    DELETE_SEMANTICS = "delete-note-semantics",
}

export interface CreateSemanticsJob{
    noteId : string,
    userId : string, //Denotes whose knowledge base it belongs to
    data: string // Title + content of the note
}

export interface UpdateSemanticsJob{
    noteId : string,
    userId : string, //Might not be required
    data: string 
}

export interface DeleteSemanticsJob{
    noteId : string,
}