import {neon} from '@neondatabase/serverless'
import {drizzle} from 'drizzle-orm/neon-http'
import '../config/env'
import { users , noteAccess, notes, tasks } from './schema'

const sql = neon(process.env.DATABASE_URL ?? "")

const db = drizzle(sql)

const main = async() => {
    try{
        
        if(process.env.ENVIRONMENT == 'PROD') return;

        console.log("Deleting all info from database")
        await db.delete(noteAccess)
        await db.delete(notes)
        await db.delete(tasks)
        await db.delete(users)

        await db.insert(users).values([
            {
                uid : "user_2vJIDchJkJo34RmqEd3jgk3HvUM",
                username: "testuser",
                name : "test",
                email: "testingsyntapticai@example.com",
                phone: "8074821478"
            }
        ])

        console.log("Added a test user !")
    }catch(e){
        console.error("Error while seeding database - ", e)
        throw e
    }
}

main()

