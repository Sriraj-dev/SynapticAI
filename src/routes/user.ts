import { Context, Hono } from "hono";
import { addSessionDetails, authMiddleware } from "../middlewares/auth";
import { UserController } from "../controllers/user.controller";
import { RedisStorage } from "../services/redis/storage";
import { BaseMessage } from "@langchain/core/messages";
import { StatusCodes } from "../utils/statusCodes";


const userRouter = new Hono()

userRouter.use('*', authMiddleware)
userRouter.use('*', addSessionDetails)

userRouter.get('/usageMetrics', async(c : Context)=> {
    const userId = c.get('userId')

    const usageMetrics = await UserController.getUserUsageMetrics(userId)

    return c.json(usageMetrics)
})

userRouter.get('/chatHistory', async(c : Context) => {
    const userId = c.get('userId')
    const sessionId = c.get('sessionId')


    console.log('sessionId', sessionId)
    console.log('userId', userId)
    const cachedData = await RedisStorage.getItem(`ChatHistory:${userId}`);
    const chatHistoryRaw = JSON.parse(cachedData || '[]');

    const chatHistory = chatHistoryRaw.map((message: any) => {
        const role = message.id?.[2];
        return {
            role,
            content: message.kwargs?.content || '',
        };
    });
  
    return c.json({ success: true, chatHistory });
})

userRouter.delete('/chatHistory', async(c : Context) => {
    const userId = c.get('userId')
    const sessionId = c.get('sessionId')

    
    await RedisStorage.removeItem(`ChatHistory:${userId}`);

    return c.json({ success: true })
})


export default userRouter