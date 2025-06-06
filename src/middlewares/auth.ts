

import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { MiddlewareHandler } from "hono"; 
import { StatusCodes } from "../utils/statusCodes";

export const authMiddleware : MiddlewareHandler = clerkMiddleware()

export const addSessionDetails: MiddlewareHandler = async (c, next) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
        return c.json({ message: 'Unauthorized' }, StatusCodes.UNAUTHORIZED);
    }

    c.set('userId', auth.userId);
    c.set('sessionId',auth.sessionId)

    await next();
}
