
import { AnyColumn, eq, sql } from 'drizzle-orm';
import { db } from '../db/index' 
import { SubscriptionTier, users, userUsageMetrics } from '../db/schema'
import { NewUser , NewUserUsageMetrics, User, UserUsageMetrics} from '../utils/models';

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

    async updateUserDetails(user : User){
        try{
            const updatedUser = await db.update(users).set(user).where(eq(users.uid, user.uid)).returning()

            return updatedUser[0]
        }catch(err){
            throw err
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

    async getUserUsageMetrics(userId: string) : Promise<UserUsageMetrics | null> {
        try{
           const userMetrics = await db.select().from(userUsageMetrics).where(eq(userUsageMetrics.userId, userId))

           if(userMetrics.length > 0) return userMetrics[0];
           else return null;
        }catch(err){
            console.log("Unable to get the user usage metrics from neon database : ", err)
            return null
        }
    },

    async resetUserUsageMetrics(userId: string) : Promise<UserUsageMetrics> {
        try{
            const userMetrics = await db.update(userUsageMetrics).set({
                today_chat_tokens: 0,
                today_voice_tokens: 0,
                today_internet_calls: 0,
                today_semantic_queries: 0,
                lastResetAt: new Date(),
            })
            .where(eq(userUsageMetrics.userId, userId)).returning();

            return userMetrics[0];
        }catch(err){
            console.log("Unable to reset user usage metrics in neon database : ", err);
            throw err;
        }
    },

    async createUserUsageMetrics(userId: string, subscription_tier : SubscriptionTier) : Promise<UserUsageMetrics> {
        try{
            const newMetrics: NewUserUsageMetrics = {
                userId: userId,
                //TODO: Set the limit values based on the subcription tier.
            };

            const metrics = await db.insert(userUsageMetrics).values(newMetrics).returning();
            return metrics[0];
        }catch(err){
            console.log("Unable to create user usage metrics in neon database : ", err);
            throw err;
        }
    },

    async incrementUserUsageMetrics(userId : string, chatTokensUsed : number = 0, voiceTokensUsed : number = 0, internetCallsUsed: number = 0, semanticQueriesUsed : number = 0) : Promise<UserUsageMetrics> {
        try{
            const increment = (column: AnyColumn, value = 1) => {
                return sql`${column} + ${value}`;
            };

            const userMetrics = await db.update(userUsageMetrics).set({
                today_chat_tokens: increment(userUsageMetrics.today_chat_tokens, chatTokensUsed),
                today_voice_tokens: increment(userUsageMetrics.today_voice_tokens, voiceTokensUsed),
                today_internet_calls: increment(userUsageMetrics.today_internet_calls, internetCallsUsed),
                today_semantic_queries: increment(userUsageMetrics.today_semantic_queries, semanticQueriesUsed),
                updatedAt: new Date(),
            })
            .where(eq(userUsageMetrics.userId, userId)).returning()
            
            return userMetrics[0];
        }catch(err){
            console.log("Unable to increment user usage metrics in neon database : ", err);
            throw err;
        }
    },

    async updateUserUsageMetricsLimit(userId:string, subscription_tier: SubscriptionTier, embedded_tokens_limit?: number, daily_chat_tokens_limit?: number, daily_voice_tokens_limit?: number, daily_internet_calls_limit?: number, daily_semantic_queries_limit?: number) : Promise<UserUsageMetrics> {
        try{
            const updatedFields = {} as UserUsageMetrics;
            updatedFields.subscription_tier = subscription_tier;
            if(embedded_tokens_limit != null)
                updatedFields.embedded_tokens_limit = embedded_tokens_limit;
            if(daily_chat_tokens_limit != null)
                updatedFields.daily_chat_tokens_limit = daily_chat_tokens_limit;
            if(daily_voice_tokens_limit != null)
                updatedFields.daily_voice_tokens_limit = daily_voice_tokens_limit;
            if(daily_internet_calls_limit != null)
                updatedFields.daily_internet_calls_limit = daily_internet_calls_limit;
            if(daily_semantic_queries_limit != null)
                updatedFields.daily_semantic_queries_limit = daily_semantic_queries_limit;

            const userMetrics = await db.update(userUsageMetrics).set(updatedFields).where(eq(userUsageMetrics.userId, userId)).returning()

            return userMetrics[0]
        }catch(err){
            throw err;
        }
    }


}
