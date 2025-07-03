import { UserController } from "../../controllers/user.controller";
import { RedisStorage } from "../redis/storage";


export const BackgroundWorkers = {

    async syncUsageMetricsFromDB(userId : string, date: string){
        setTimeout(async () => {
            try {
                console.log(`Syncing usage metrics for user ${userId} on date ${date}`);
                //1. Fetch the usage metrics from the database for the given userId.
                let userMetrics = await UserController.getUserUsageMetrics(userId)

                //2. Check if the metrics belongs to the current date and if not, reset the metrics.
                if (userMetrics && userMetrics.lastResetAt.toISOString().split('T')[0] !== date) {
                    // Reset the metrics for the user
                    console.log(`Resetting usage metrics for user ${userId} on date ${date}`);
                    userMetrics = await UserController.resetUserUsageMetrics(userId);
                }
                
                //3. Store the metrics in Redis with the key `user_usage_metrics:${userId}:${date}`
                await RedisStorage.setItemAsync(`user_usage_metrics:${userId}:${date}`, JSON.stringify(userMetrics), 86400);

            } catch (err) {
                console.error(`Failed to sync usage metrics for user ${userId} on date ${date}:`, err);
            }
        }
        , 0); 
    },

    async updateUsageMetrics(userId : string, date: string, chatTokensUsed :number = 0, voiceTokensUsed : number=0, internetCallsUsed: number = 0, semanticQueriesUsed : number = 0){
        setTimeout(async () => {
            try {
                /*
                TODO: Consider the following change when necessary.
                    Usually We need to just update the redis cache & a lambda like function updates the postgres db every hour or so.
                    But that can be over engineering for now, so we will just update the postgres db & redis cache here itself.
                */
               console.log(`Updating usage metrics for user ${userId} on date ${date}`);
                //1. Update in postgres database by incrementing the usage metrics.
                const updatedUserMetrics = await UserController.incrementUserUsageMetrics(userId, chatTokensUsed, voiceTokensUsed, internetCallsUsed, semanticQueriesUsed);

                //2. Update the redis cache with the new usage metrics
                if(updatedUserMetrics.lastResetAt.toISOString().split('T')[0] == date) {
                    await RedisStorage.setItemAsync(`user_usage_metrics:${userId}:${date}`, JSON.stringify(updatedUserMetrics));
                }else{
                    //any how in the next call, DB is gonna be reset.
                }
                
            } catch (err) {
                console.error(`Failed to update chat usage metrics for user ${userId} on date ${new Date()}:`, err);
            }
        }
        , 0); 
    },
}