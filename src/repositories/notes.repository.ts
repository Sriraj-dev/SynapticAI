
import { eq, exists, gte, inArray, lte, sql } from 'drizzle-orm'
import { db } from '../db/index'
import {AccessLevel, AccessStatus, noteAccess, notes, NoteStatusLevel, users} from '../db/schema'
import { NewNote, Note, NoteAccess, SemanticNote, SemanticSearchResponse } from '../utils/models'
import { and } from 'drizzle-orm'


export const NotesRepository = {

    async createNote(note: NewNote) : Promise<Note> {
        try{
            const newNote = await db.insert(notes).values(note).returning()
            return newNote[0];
        }catch(err){
            console.log(`Unable to add the new note into the db : ${note}, Error : ${err}`)
            throw err;
        }
    },

    async getNotesByUserId(userId: string) : Promise<Note[]>{
        try{
            const userNotes = await db.select().from(notes).where(eq(notes.owner_id, userId))
            return userNotes
        }catch(err){
            console.log(`Unable to get the notes for the user : ${userId}, Error : ${err}`)
            throw err;
        }
    },

    async getNotesByDateRange(start_date: Date, end_date: Date, userId: string) : Promise<Note[]>{
        try{
            const userNotes = await db.select().from(notes).where(
                and(
                    eq(notes.owner_id, userId),
                    gte(notes.updatedAt, start_date),
                    lte(notes.updatedAt, end_date)
                )
            )

            return userNotes
        }catch(err){
            console.log(`❌ Unable to get the notes for the user : ${userId}, Error : ${err}`)
            throw err;
        }
    },

    async getSemanticNoteChunks(queryEmbedding: string, userId:string) : Promise<SemanticSearchResponse[]>{
        try{
            
            const results = await db.execute(
                sql`select note_id, chunk_index, total_chunks, content, (1 - (embedding_v2 <=> ${queryEmbedding})) * 100 as similarity
                  from semantic_notes
                  where user_id = ${userId}
                  order by similarity desc
                  limit 20`
            )

            return results.rows as SemanticSearchResponse[] 
        }catch(err){
            console.log(`❌ Unable to get the semantic notes, Error : ${err}`)
            throw err;
        }
    },

    async getNoteAccess(userId : string, noteId : string) : Promise<[AccessLevel, string | null]> {
        try{
            const access_level = await db.select({access : noteAccess.access_level, ownerId : noteAccess.owner_id}).from(noteAccess)
                .where(and(eq(noteAccess.user_id, userId),eq(noteAccess.note_id,noteId))).limit(1)
            
            if(access_level.length === 0){
                return [AccessLevel.Denied, null];
            }

            if(access_level[0].ownerId === userId) return [AccessLevel.Owner, userId]
            if(access_level[0].access === AccessStatus.Pending) return [AccessLevel.Denied, access_level[0].ownerId]
            
            return [access_level[0].access as AccessLevel, access_level[0].ownerId];
        }catch(err){
            console.log(`Unable to get the note access for the user : ${userId}, Error : ${err}`)
            throw err;
        }
    },

    async getNoteById(id: string) : Promise<Note>{
        try{
            const note = await db.select().from(notes).where(eq(notes.uid, id))
            return note[0]
        }catch(err){
            console.log(`Unable to get the note for the id : ${id}, Error : ${err}`)
            throw err;
        }
    },

    async updateNote(id: string, note: Partial<Note>) : Promise<Note>{
        try{
            const updatedNote = await db.update(notes).set(
                {
                    ...note, 
                    status: NoteStatusLevel.Memorizing
                }
            ).where(eq(notes.uid, id)).returning()
            return updatedNote[0]    
        }catch(err){
            console.log(`Unable to update the note for the id : ${id}, Error : ${err}`)
            throw err;
        }
    },

    async updateMultipleNotes(
        updates: { id: string; note: Partial<Note> }[]
      ): Promise<Note[]> {
        try {
            const results: Note[] = [];

            for (const { id, note } of updates) {
                const updatedNote = await db
                .update(notes)
                .set({
                    ...note,
                    updatedAt: new Date(),
                })
                .where(eq(notes.uid, id))
                .returning();

                if (updatedNote.length > 0) {
                    results.push(updatedNote[0]);
                }
            }

            return results;
        } catch (err) {
          console.error(`Unable to update notes. Error: ${err}`);
          throw err;
        }
    },

    async deleteNotes(ids: string[]) : Promise<Note[]> {
        try{
            const deletedNotes = await db.delete(notes).where(inArray(notes.uid, ids)).returning()
            return deletedNotes
        }catch (err) {
            console.log(`Unable to delete the notes for ids: ${ids.join(', ')}, Error: ${err}`);
            throw err;
        }
    },

    async addNoteAccess(ownerId :string, userId : string, noteId : string, access : AccessLevel, status: AccessStatus) : Promise<NoteAccess>{
        try{
            const note_access = await db.insert(noteAccess)
                .values({owner_id:ownerId, user_id : userId, note_id : noteId, access_level : access, status: status})
                .returning()
            
            return note_access[0]
        }catch(err){
            console.log(`Unable to give access to the user : ${userId}, Error : ${err}`)
            throw err;
        }
    },

    async addNoteAccess_v2(noteId : string, ownerId : string, userIds : string[], access : AccessLevel, status : AccessStatus){
        try{
            const access_level = await db.insert(noteAccess)
                .values(userIds.map((userId) => ({owner_id:ownerId, user_id : userId, note_id : noteId, access_level : access, status: status})))
                .returning()

            return true
        }catch(err){
            console.log(`Unable to give access to the users : ${userIds}, Error : ${err}`)
            throw err;
        }
    },

    async updateNoteAccess(requestId: string, status: AccessStatus, access?: AccessLevel) : Promise<boolean>{
        try{
            if(access)
                await db.update(noteAccess)
                    .set({access_level : access, status: status, updatedAt: new Date()})
                    .where(eq(noteAccess.uid, requestId))
                    .returning()
            else
                await db.update(noteAccess)
                    .set({status: status, updatedAt: new Date()})
                    .where(eq(noteAccess.uid, requestId))
                    .returning()

            return true
        }catch(err){
            console.log(`Unable to update access to the requestId : ${requestId}, Error : ${err}`)
            throw err;
        }
    },

    async getAccessRequestsByUserId(ownerId:string){
        
        try{
            const accessRequests = await db
                .select({
                    accessId: noteAccess.uid,
                    noteId: noteAccess.note_id,
                    noteTitle: notes.title,
                    requesterId: noteAccess.user_id,
                    requesterName: users.username,
                    requesterAlias: users.name,
                    requesterEmail: users.email,
                    status: noteAccess.status,
                    accessLevel: noteAccess.access_level,
                })
                .from(noteAccess)
                .where(
                    and(eq(noteAccess.owner_id, ownerId), eq(noteAccess.status, AccessStatus.Pending))
                )
                .innerJoin(notes, eq(noteAccess.note_id, notes.uid))
                .innerJoin(users, eq(noteAccess.user_id, users.uid));

            return accessRequests
        }catch(err){
            console.log(`Unable to get access requests for the user : ${ownerId}, Error : ${err}`)
            throw err;
        }
    
    }



}
    