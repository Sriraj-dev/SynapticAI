import {  Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { addSessionDetails, authMiddleware } from "../middlewares/auth";
import { greetingAgentHandler } from "../controllers/audioWrapper.controller";

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

wsRouter.get('/askAI', authMiddleware, addSessionDetails , upgradeWebSocket(() => ({
    onMessage(evt, ws) {
        console.log('Message from client:', evt.data);
        ws.send('Hello from server!');
    },
    onOpen(_, ws) {
        console.log('WebSocket connection opened');
    },
    onClose(evt, ws) {
        console.log('WebSocket connection closed');
    },
    onError(error, ws) {
        console.error('WebSocket error:', error);
    },

    idleTimeout: 60,
    closeOnBackpressureLimit: true
})
))





