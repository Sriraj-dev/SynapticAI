import { AccessLevel, AccessStatus, TaskStatusLevel } from "../../db/schema"
import { Note } from "../models"


export type NoteUpdateRequest = {
    title?: string,
    content?: string
}

export type NoteCreateRequest = {
    userId? : string,
    title? : string,
    content : string,
    folder? : string
}

export type NewTaskRequest = {
    owner_id? : string,
    title : string,
    content? : string,
    time_logged? : number,
    status? : TaskStatusLevel
}

export type UpdateTaskRequest = {
    status? : TaskStatusLevel,
    content? : string,
    title? :string,
    time_logged? : number
}

export type GrantAccessRequest = {
    noteId : string,
    access : AccessLevel,
    view_access_Ids : string[],
    edit_access_Ids : string[],
}

export type AccessRequestModel = {
    noteId : string,
    access : AccessLevel,
}

export type UpdateAccessRequest = {
    requestId : string,
    status : AccessStatus
}

export type AgentRequest = {
    userMessage : string,
    url?: string,
    context?: string,
}

// For updating mutliple notes
export type UpdateNotePayload = {
    id: string;
    note: Partial<Note>;
};

export type UpdateNotesMetaDataRequestBody = {
    updates: UpdateNotePayload[];
};