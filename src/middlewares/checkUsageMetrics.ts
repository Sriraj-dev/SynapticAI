import { MiddlewareHandler } from "hono";
import { UserUsageMetrics } from "../utils/models";
import { BackgroundWorkers } from "../services/WorkerService/background_workers";
import { RedisStorage } from "../services/redis/storage";

/*
Token Limits on SynapticAI are on the following basis:
1. Chat Tokens -- Daily Limit
2. Audio Tokens -- Daily Limit & lifetime limit
3. Total knowledge base tokens -- lifetime limit
4. Total Internet Calls -- daily limiy
5. Semantic Queries -- Not decided on which limit to apply yet.

Checking the knowledge base tokens is handled in worker service while creating or updating notes.

Checking the internet calls are handled inside the agent before calling the tool.
*/

/*
TODO: (Adding TODO statement just to keep in mind)
Right now, limits are enforced very loosely. 
i.e. As per current implementation, few extra tokens might be used by the user per day but thats okay for now!
*/

export const checkChatTokenLimit : MiddlewareHandler = async (c, next) => {
    
    const userId = c.get("userId")
    const date = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

    const usageMetrics = await RedisStorage.getItem(`user_usage_metrics:${userId}:${date}`)

    if(!usageMetrics || usageMetrics === "") {
        console.log("No usage metrics found in Redis, Allowing Request and syncing from DB")
        await next()

        BackgroundWorkers.syncUsageMetricsFromDB(userId, date)
    }else{
        const metrics = JSON.parse(usageMetrics) as UserUsageMetrics

        //No need to consider the current requests tokens into the calculation --just for simplicity.
        if(metrics.today_chat_tokens >= metrics.daily_chat_tokens_limit) {
            return c.json({
                error: "Whoa! you have reached your daily limit.Consider Upgrading your plan or try again tomorrow"
            }, 429)
        }

        console.log("Usage is under limit, Allowing Request")
        await next()
    }
}

export const checkAudioTokenLimit : MiddlewareHandler = async (c, next) => {
    const userId = c.get("userId")
    const date = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

    const usageMetrics = await RedisStorage.getItem(`user_usage_metrics:${userId}:${date}`)

    if(!usageMetrics || usageMetrics === "") {
        await next()

        BackgroundWorkers.syncUsageMetricsFromDB(userId, date)
    }else{
        const metrics = JSON.parse(usageMetrics) as UserUsageMetrics

        //No need to consider the current requests tokens into the calculation --just for simplicity.
        if(metrics.today_voice_tokens >= metrics.daily_voice_tokens_limit) {
            return c.json({
                error: "Sorry, you have reached your daily limit. Please try again tomorrow or consider upgrading your plan."
            }, 429)
        }

        await next()
    }
}

