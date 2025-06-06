import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { addSessionDetails, authMiddleware } from "../middlewares/auth";
import { Context } from "hono";
import { AgentRequest } from "../utils/apiModels/requestModels";
import { AgentController } from "../controllers/askAI.controller";
import { checkChatTokenLimit } from "../middlewares/checkUsageMetrics";
import { BackgroundWorkers } from "../services/WorkerService/background_workers";


const askAIRouter = new Hono();
askAIRouter.use('*', authMiddleware)
askAIRouter.use("*", addSessionDetails)
askAIRouter.use("*", checkChatTokenLimit)

askAIRouter.post("/",async (c : Context)=>{
    const userId = c.get("userId")
    const sessionId = c.get("sessionId")

    const body = await c.req.json<AgentRequest>();
    
    return streamSSE(c,async (stream) => {
        try {
            c.header('Access-Control-Allow-Origin', '*'); // Or your specific extension ID
            c.header('Access-Control-Allow-Credentials', 'true');

            if (!body.userMessage) {
                await stream.writeSSE({
                    event: "error",
                    data: JSON.stringify({ error: "Query is Empty!" }),
                });
                stream.close();
                return;
            }
            
            const agentStream = AgentController.invokeAgent(
                userId,
                sessionId,
                body
            );
            let tokens_used = 0;
            for await (const chunk of agentStream){
                if(chunk.tokens_used) tokens_used += chunk.tokens_used;
                await stream.writeSSE({
                    event: chunk.type,
                    data: JSON.stringify(chunk.data),
                    id: `${chunk.type}-${Date.now()}`
                })
                if(chunk.type == "complete"){
                    console.log("Sending Final Event and Closing Stream")
                    if(tokens_used > 0) {
                        // Update the usage metrics in Redis and DB
                        BackgroundWorkers.updateUsageMetrics(userId, new Date().toISOString().split('T')[0], tokens_used);
                    }
                    stream.close()
                }
            }
          
            // Send final event
            await stream.write(`event: complete\ndata: {}\n\n`);

        } catch (error) {
            console.log(error)
            await stream.write(`event: error\ndata: ${JSON.stringify({ error: "Internal server error" })}\n\n`);
        } finally {
            stream.close();
        }
    });
})

export default askAIRouter;
