// import {neon} from '@neondatabase/serverless'
// import {drizzle} from 'drizzle-orm/neon-http'
// import { ENVIRONMENT, DATABASE_URL } from '../config/env'
// import { users , noteAccess, notes, tasks } from './schema'

// const sql = neon(DATABASE_URL)

// const db = drizzle(sql)

// const main = async() => {
//     try{
        
//         if(ENVIRONMENT == 'PROD') return;

//         console.log("Deleting all info from database")
//         await db.delete(noteAccess)
//         await db.delete(notes)
//         await db.delete(tasks)
//         await db.delete(users)
//     }catch(e){
//         console.error("Error while seeding database - ", e)
//         throw e
//     }
// }

// main()

