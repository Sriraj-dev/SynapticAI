import { Context } from "hono";
import { NotesRepository } from "../repositories/notes.repository";
import { NewNote, Note } from '../utils/models'
import { AccessLevel, AccessStatus, NoteStatusLevel } from "../db/schema";
import { StatusCodes } from "../utils/statusCodes";
import { NoteUpdateRequest, NoteCreateRequest, UpdateNotesMetaDataRequestBody } from "../utils/apiModels/requestModels";
import { NotFoundError } from "../utils/errors";
import { CreateSemanticsJob, DeleteSemanticsJob, JobTypes, UpdateSemanticsJob } from "../services/redis/queue_utils";
import { notesEmbeddingModel, SEMANTIC_SEARCH_SIMILARITY_THRESHOLD } from "../services/AI/aiModels";
import { persistDataWorkerQueue, semanticsWorkerQueue } from "../services/redis/bullmq";
import { RedisStorage } from "../services/redis/storage";


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
        if(newNote.content !== undefined && newNote.content.length>0){
            semanticsWorkerQueue.add(
                JobTypes.CREATE_SEMANTICS,
                JSON.stringify({ noteId: note.uid, userId: userId, data: `${newNote.title ?? ""} ${newNote.content}` } as CreateSemanticsJob)
            )
        }

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

            const [accessLevel, ownerId] = await NotesRepository.getNoteAccess(userId, noteId)

            if(accessLevel === AccessLevel.Denied){
                return c.json({ message: 'Access Denied' }, StatusCodes.ACCESS_DENIED);
            }

            const note : Note = await NotesRepository.getNoteById(noteId)

            //Lets see if we can find a way to fetch all the notes form the redis itself directly.
            const updates = await RedisStorage.getItem(`Note:${noteId}`)
            if(updates != null){
                const parsedUpdates = JSON.parse(updates);
                if (parsedUpdates.status) {
                    note.status = parsedUpdates.status;
                }
                if (parsedUpdates.content) {
                    note.content = parsedUpdates.content;
                }
            }

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

        const [accessLevel, ownerId] = await NotesRepository.getNoteAccess(userId, noteId)

        if(accessLevel != AccessLevel.Owner){
            return c.json({ message: 'Access Denied' }, StatusCodes.ACCESS_DENIED);
        }

        //This Will delete the notes semantics as well via cascade delete
        const notes : Note[] = await NotesRepository.deleteNotes([noteId])
        persistDataWorkerQueue.remove(`persist-note-${noteId}`)
        semanticsWorkerQueue.remove(`update-note-semantics-${noteId}`)

        await RedisStorage.removeItem(`Note:${noteId}`) 

        return c.json({ message: `Succesfull`, data : notes[0]}, StatusCodes.OK);
    },

    async deleteUserNoteEmbeddings(c : Context){
        const userId = c.get('userId')
        const noteId = c.req.param('id')

        semanticsWorkerQueue.remove(`update-note-semantics-${noteId}`)
        semanticsWorkerQueue.add(
            JobTypes.DELETE_SEMANTICS,
            JSON.stringify({ noteId: noteId } as DeleteSemanticsJob),
            { removeOnComplete: 1 , jobId: `delete-note-semantics-${noteId}`, delay: 300000}
        )

        await RedisStorage.setItemAsync(`Note:${noteId}`, JSON.stringify({status : NoteStatusLevel.NotMemorized}), 60 * 60)

        return c.json({message: `Successfull`, data : {status : NoteStatusLevel.NotMemorized}}, StatusCodes.OK);
    },

    //This endpoint is called only when the content of the note is changed, updating folder & title are handled by different endpoint.
    //This endpoint is being repeatedly called from the frontend's text editor changes, So it is very important to debounce the requests, instead of updating the database & vectors on every call.
    async updateUserNote(c:Context){
        const userId = c.get('userId')
        const noteId = c.req.param('id')

        const body = await c.req.json<NoteUpdateRequest>()

        if(body.generateEmbeddings === undefined) body.generateEmbeddings = true;

        const [accessLevel, ownerId] = await NotesRepository.getNoteAccess(userId, noteId)

        if(accessLevel === AccessLevel.View || accessLevel === AccessLevel.Denied){
            return c.json({ message: 'Access Denied' }, StatusCodes.ACCESS_DENIED);
        }
        
        if(body.content !== undefined){
            console.log("Updating Redis cache with new note content")
            await RedisStorage.setItemAsync(`Note:${noteId}`, JSON.stringify({content : body.content, status: (body.generateEmbeddings)? NoteStatusLevel.Memorizing : NoteStatusLevel.NotMemorized}), 60 * 60) // expires in 1 hour.

            persistDataWorkerQueue.add(
                JobTypes.PERSIST_NOTE_DATA,
                JSON.stringify({noteId: noteId}),
                {
                    delay: 300000, //Updates the postgres after 5 minutes.
                    jobId: `persist-note-${noteId}`, // Unique job ID to prevent duplicates
                    removeOnComplete: true
                }
            )
        }


        if(body.content !== undefined && body.generateEmbeddings){
            //Triggering Background worker via redis queue update the note semantics.
            console.log("Pushing Update semantics job with 10 min delay")

            semanticsWorkerQueue.remove(`update-note-semantics-${noteId}`)
            semanticsWorkerQueue.add(
                JobTypes.UPDATE_SEMANTICS,
                JSON.stringify({ noteId: noteId, userId: ownerId, data: `${body.title ?? ""} ${body.content ?? ""}` } as UpdateSemanticsJob),
                {
                    delay: 600000, // Delay by 10 minutes.
                    jobId: `update-note-semantics-${noteId}`, // Unique job ID to prevent duplicates
                    removeOnComplete: true
                }
            )
        }

        return c.json({ message: `Succesfull`, data : {content : body.content, status: (body.generateEmbeddings) ? NoteStatusLevel.Memorizing : NoteStatusLevel.NotMemorized} as Note}, StatusCodes.OK);
    },

    async deleteMultipleNotes(c : Context){
        const body = await c.req.json();
        const noteIds: string[] = body.noteIds;
        console.log(noteIds)
        if(!noteIds || noteIds.length === 0){
            return c.json({ message: 'Please provide noteIds' }, StatusCodes.BAD_REQUEST);
        }

        const notes : Note[] = await NotesRepository.deleteNotes(noteIds)
        //TODO: Delete the notes from redis cache as well.

        return c.json({ message: `Succesfull`, data : notes}, StatusCodes.OK);
    },

    // This endpoint is used to update the metadata of multiple notes, like title & folder.
    async updateMultipleNotes(c : Context){
        //Note : This endpoint is only called when there is a change in folder structure in frontend, so we need not update semantics in this handler.
        const body = await c.req.json<UpdateNotesMetaDataRequestBody>();

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


