import { Context, Hono } from "hono";
import { addSessionDetails, authMiddleware } from "../middlewares/auth";
import { UserController } from "../controllers/user.controller";
import { RedisStorage } from "../services/redis/storage";
import { BaseMessage } from "@langchain/core/messages";
import { StatusCodes } from "../utils/statusCodes";
import { checkChatTokenLimit } from "../middlewares/checkUsageMetrics";
import { BackgroundWorkers } from "../services/WorkerService/background_workers";
import { estimateTokens } from "../utils/utility_methods";


const userRouter = new Hono()

userRouter.use('*', authMiddleware)
userRouter.use('*', addSessionDetails)

userRouter.get('/usageMetrics', async(c : Context)=> {
    const userId = c.get('userId')

    const usageMetrics = await UserController.getUserUsageMetrics(userId)

    return c.json(usageMetrics)
})

userRouter.use('/textCompletions', checkChatTokenLimit)
userRouter.post('/textCompletions',async (c : Context)=>{
    const userId = c.get('userId')

    const body = await c.req.json()
    if(body.query == undefined || body.query == '') {
        return c.json({ error: 'Query is required' }, StatusCodes.BAD_REQUEST)
    }

    const tokens_used = estimateTokens(body.query)
    //Assuming the response from AI is close to the query length
    BackgroundWorkers.updateUsageMetrics(userId, new Date().toISOString().split('T')[0], Math.ceil(tokens_used * 2));

    return c.json({tokens : tokens_used}, StatusCodes.OK)
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