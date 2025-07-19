

import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { MiddlewareHandler } from "hono"; 
import { StatusCodes } from "../utils/statusCodes";
import { verifyToken } from "@clerk/backend";

/*

*/
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

export const wsAuthMiddleware: MiddlewareHandler = async (c, next) => {
    const url = new URL(c.req.url);
    const token = url.searchParams.get("token");
    const activeUrl = url.searchParams.get("activeUrl");
    const context = url.searchParams.get("context");
    if (!token) {
      return c.json({ error: "Unauthorized (no token)" }, 401);
    }
  
    try {
      const verifiedToken = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      })

      const userId = verifiedToken.sub;
      if (!userId || typeof userId !== 'string' || userId.length === 0) {
        return c.json({ error: "Unauthorized (invalid token)" }, StatusCodes.UNAUTHORIZED);
      }

      c.set("userId", userId);
      c.set("sessionId", verifiedToken.sid)
      c.set("activeUrl", activeUrl || "");
      c.set("context", context || "");
      
      await next();
    } catch (err) {
      console.error("❌ Clerk token verification failed:", err);
      return c.json({ message: 'Unauthorized' }, StatusCodes.UNAUTHORIZED);
    }
};
