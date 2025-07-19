import {  Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { wsAuthMiddleware } from "../middlewares/auth";
import { greetingAgentHandler, SynapticAgentHandler } from "../controllers/audioWrapper.controller";
import { checkAudioTokenLimit } from "../middlewares/checkUsageMetrics";

export const wsRouter = new Hono()
export const { upgradeWebSocket, websocket } = createBunWebSocket();

/*
TODO: 
1. STT Models can be run in-house to avoid costs
2. Can be run in a multiple containers with load balancers when it reaches that stage
*/

/*
TODO: 
If Free User, Check if the user has reached the limit of say 1000 characters per day & disallow him to do voice chat.
If Paid User, Then we can go unlimited.
-- May be we can use redis in the middleware to quickly handle this before establishing the websocket connection.
*/

wsRouter.get('/greeting-agent', upgradeWebSocket(greetingAgentHandler))

wsRouter.get('/askAI', wsAuthMiddleware,checkAudioTokenLimit, upgradeWebSocket(SynapticAgentHandler))



