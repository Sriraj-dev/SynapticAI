
import { eq } from 'drizzle-orm';
import { db } from '../db/index' 
import { users } from '../db/schema'
import { NewUser , User} from '../utils/models';

export const UsersRepository = {
    
    async addNewUser (newUser : NewUser) : Promise<User> {
        try{
            const user = await db.insert(users).values(newUser).returning()
            return user[0];
        }catch(err){
            console.log("Unable to add the new user to neon database : ",err)
            throw err;
        }
    },

    async getUserById(userId: string) : Promise<User | null> {
        try{
            const user = await db.select().from(users).where(eq(users.uid, userId))
            
            if(user.length > 0) return user[0];
            else return null;

        }catch(err){
            console.log("Unable to get the user from neon database : ", err)
            throw err;
        }
    },

}
