import { MiddlewareHandler } from "hono";
import redis from "../services/redis/redis";

/*
Checking the semantic tokens is handled in worker service while creating or updating notes.

Checking the internet calls are handled inside the agent before calling the tool.
*/

const checkChatTokenLimit : MiddlewareHandler = async (c, next) => {
    
    const userId = c.get("userId")
    const tokensUsed = await redis.get(`today_chat_tokens:${userId}`)

    if(!tokensUsed){
        //TODO: Allow the request & try to sync the tokens from postgres or set as 0.
        await next()
    }

    //TODO: check if the tokens exceed the limit and return an error if so.
    await next()
}

const checkAudioTokenLimit : MiddlewareHandler = async (c, next) => {
    //TODO: Implement the same logic as above.
    await next()
}

