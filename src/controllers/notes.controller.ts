import { Context } from "hono";
import { NotesRepository } from "../repositories/notes.repository";
import { NewNote, Note } from '../utils/models'
import { AccessLevel, AccessStatus, NoteStatusLevel } from "../db/schema";
import { StatusCodes } from "../utils/statusCodes";
import { NoteUpdateRequest, NoteCreateRequest, UpdateNotesRequestBody } from "../utils/apiModels/requestModels";
import { NotFoundError } from "../utils/errors";
import redis from "../services/redis/redis";
import { CreateSemanticsJob, JobQueue } from "../services/redis/queue_utils";
import { notesEmbeddingModel, SEMANTIC_SEARCH_SIMILARITY_THRESHOLD } from "../services/AI/aiModels";


export const NotesController = {

    async createNote(userId : string, newNote: NoteCreateRequest){

        // TODO: Convert the users note into reliable format like HTML, Markdown etc as per rich-text editor integrated with frontend.
        const update = {
            owner_id: userId,
            title: newNote.title,
            content: newNote.content,
            folder: newNote.folder,
            status: NoteStatusLevel.Memorizing
        } as NewNote

        //1. Add the note into notes table
        const note : Note = await NotesRepository.createNote(update)
        
        //2. Create Embeddings for the new notes and store it in DB, push a job into redis queue & will be handled by worker service
        redis.rpush(JobQueue.CREATE_SEMANTICS, JSON.stringify({
            noteId: note.uid,
            userId: userId,
            data: `${newNote.title ?? ""} ${newNote.content}`
        } as CreateSemanticsJob))

        //3. Give Relavant access to user.
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

    async getNotesByDateRange(start_date: Date, end_date: Date, userId: string){
        const notes : Note[] = await NotesRepository.getNotesByDateRange(start_date, end_date, userId)

        return notes;
    },

    async getSemanticNoteChunks(query: string, userId: string){
        const embeddings = await notesEmbeddingModel.getTextEmbedding(query)
        const formattedEmbedding = `[${embeddings.join(',')}]`
        
        const semantic_notes = await NotesRepository.getSemanticNoteChunks(formattedEmbedding, userId)

        return semantic_notes.filter((note) => note.similarity > SEMANTIC_SEARCH_SIMILARITY_THRESHOLD)
    },

    async deleteUserNote(c : Context){
        const userId = c.get('userId')

        const noteId = c.req.param('id')

        const accessLevel : AccessLevel = await NotesRepository.getNoteAccess(userId, noteId)

        if(accessLevel != AccessLevel.Owner){
            return c.json({ message: 'Access Denied' }, StatusCodes.ACCESS_DENIED);
        }

        //This Will delete the notes semantics as well via cascade delete
        const notes : Note[] = await NotesRepository.deleteNotes([noteId])

        return c.json({ message: `Succesfull`, data : notes[0]}, StatusCodes.OK);
    },

    async updateUserNote(c:Context){
        const userId = c.get('userId')
        const noteId = c.req.param('id')

        const body = await c.req.json<NoteUpdateRequest>()

        const accessLevel : AccessLevel = await NotesRepository.getNoteAccess(userId, noteId)

        if(accessLevel === AccessLevel.View || accessLevel === AccessLevel.Denied){
            return c.json({ message: 'Access Denied' }, StatusCodes.ACCESS_DENIED);
        }

        const update: Partial<Note> = {
            updatedAt: new Date(),
        };
        
        if (body.title !== undefined) update.title = body.title;
        if (body.content !== undefined) update.content = body.content;
        if (body.folder !== undefined) update.folder = body.folder;

        const note : Note = await NotesRepository.updateNote(noteId, update)

        if(body.content){
            redis.rpush(JobQueue.UPDATE_SEMANTICS, JSON.stringify({
                noteId: noteId,
                userId: note.owner_id,
                data: `${update.title ?? ""} ${update.content ?? ""}`
            } as CreateSemanticsJob))
        }

        return c.json({ message: `Succesfull`, data : note}, StatusCodes.OK);
    },

    async deleteMultipleNotes(c : Context){
        const body = await c.req.json();
        const noteIds: string[] = body.noteIds;
        console.log(noteIds)
        if(!noteIds || noteIds.length === 0){
            return c.json({ message: 'Please provide noteIds' }, StatusCodes.BAD_REQUEST);
        }

        const notes : Note[] = await NotesRepository.deleteNotes(noteIds)

        return c.json({ message: `Succesfull`, data : notes}, StatusCodes.OK);
    },

    async updateMultipleNotes(c : Context){
        //Note : This endpoint is only called when there is a change in folder structure in frontend, so we need not update semantics in this handler.
        // Having said that, we need to note somewhere that this endpoint doesnt update the semantics of the notes.
        const body = await c.req.json<UpdateNotesRequestBody>();

        const { updates } = body;

        if (
        !Array.isArray(updates) ||
        updates.some(
            (u) =>
            typeof u.id !== "string" ||
            typeof u.note !== "object" ||
            u.note === null
        )
        ) {
            return c.json({ error: "Invalid request format" }, 400);
        }

        const updatedNotes = await NotesRepository.updateMultipleNotes(updates);

        return c.json({ success: true, updated: updatedNotes });
    }
}


