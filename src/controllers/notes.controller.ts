import { Context } from "hono";
import { NotesRepository } from "../repositories/notes.repository";
import { NewNote, Note } from '../utils/models'
import { AccessLevel, AccessStatus } from "../db/schema";
import { StatusCodes } from "../utils/statusCodes";
import { NoteUpdateRequest, NoteCreateRequest } from "../utils/apiModels/requestModels";
import { NotFoundError } from "../utils/errors";


export const NotesController = {

    async createNote(userId : string, newNote: NoteCreateRequest){

        //const newNote : NoteCreateRequest = await c.req.json<NoteCreateRequest>()

        const update = {
            owner_id: userId,
            title: newNote.title,
            content: newNote.content,
            folder: newNote.folder,
        } as NewNote

        const note : Note = await NotesRepository.createNote(update)
        await NotesRepository.addNoteAccess(userId, userId, note.uid, AccessLevel.Owner, AccessStatus.Granted)

        return note;
    },
    
    async getAllNotes(c : Context){
        const userId = c.get('userId')
        
        const userNotes : Note[] = await NotesRepository.getNotesByUserId(userId)

        return c.json({ message: (userNotes.length ===0)?`No memories found for the user`: `Succesfull` , data : userNotes}, 200);
    },

    async getNoteById(c : Context){
        try{
            const userId = c.get('userId')

            const noteId = c.req.param('id')

            const accessLevel : AccessLevel = await NotesRepository.getNoteAccess(userId, noteId)

            if(accessLevel === AccessLevel.Denied){
                return c.json({ message: 'Access Denied' }, StatusCodes.ACCESS_DENIED);
            }

            const note : Note = await NotesRepository.getNoteById(noteId)

            return c.json({ message: `Succesfull`, data : note}, StatusCodes.OK);

        }catch(err){
            console.log(`Error in getting note : ${err}`)
            throw new NotFoundError()
        }
    },

    async deleteUserNote(c : Context){
        const userId = c.get('userId')

        const noteId = c.req.param('id')

        const accessLevel : AccessLevel = await NotesRepository.getNoteAccess(userId, noteId)

        if(accessLevel != AccessLevel.Owner){
            return c.json({ message: 'Access Denied' }, StatusCodes.ACCESS_DENIED);
        }

        const note : Note = await NotesRepository.deleteNote(noteId)

        return c.json({ message: `Succesfull`, data : note}, StatusCodes.OK);
    },

    async updateUserNote(c:Context){
        const userId = c.get('userId')
        const noteId = c.req.param('id')

        const body = await c.req.json<NoteUpdateRequest>()

        const accessLevel : AccessLevel = await NotesRepository.getNoteAccess(userId, noteId)

        if(accessLevel === AccessLevel.View || accessLevel === AccessLevel.Denied){
            return c.json({ message: 'Access Denied' }, StatusCodes.ACCESS_DENIED);
        }

        const update = {
            uid : noteId,
            title : body.title,
            content : body.content,
            folder : body.folder,
            updatedAt : new Date()
        } as Note

        const note : Note = await NotesRepository.updateNote(noteId, update)

        return c.json({ message: `Succesfull`, data : note}, StatusCodes.OK);
    }
}


