import { AccessLevel, AccessStatus } from "../db/schema";
import { NotesRepository } from "../repositories/notes.repository";
import { NoteAccess } from "../utils/models";


export const NotesAccessController = {
    
    async addNoteAccess(noteId: string, ownerId : string, view_access_Ids : string[], edit_access_Ids : string[], status: AccessStatus) : Promise<boolean>{
        let { view_access, edit_access } = { view_access: true, edit_access: true };

        if(view_access_Ids.length > 0)
            view_access = await NotesRepository.addNoteAccess_v2(noteId, ownerId, view_access_Ids, AccessLevel.View, status)
        
        if(edit_access_Ids.length > 0)
            edit_access = await NotesRepository.addNoteAccess_v2(noteId, ownerId, edit_access_Ids, AccessLevel.Edit, status)

        return view_access && edit_access;
    },

    async getAccessRequests(ownerId : string){
        var accessRequests = await NotesRepository.getAccessRequestsByUserId(ownerId)
        return accessRequests
    },

    async updateAccessRequest(requestId : string, status : AccessStatus, access? : AccessLevel): Promise<boolean> {
        var accessRequest = await NotesRepository.updateNoteAccess(requestId, status, access)
        return accessRequest
    },

    async requestAccess(userId : string, noteId : string, access : AccessLevel) : Promise<NoteAccess>{

        const ownerId = (await NotesRepository.getNoteById(noteId)).owner_id

        var accessRequest = await NotesRepository.addNoteAccess(ownerId, userId, noteId, access, AccessStatus.Pending)
        return accessRequest
    }


}