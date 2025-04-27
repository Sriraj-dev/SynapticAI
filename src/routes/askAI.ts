import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { addSessionDetails, authMiddleware } from "../middlewares/auth";
import { Context } from "hono";
import { AgentRequest } from "../utils/apiModels/requestModels";
import { AgentController } from "../controllers/askAI.controller";


const askAIRouter = new Hono();
askAIRouter.use('*', authMiddleware)
askAIRouter.use("*", addSessionDetails)

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

            for await (const chunk of agentStream){
                console.log("Writing event to stream")
                await stream.writeSSE({
                    event: chunk.type,
                    data: JSON.stringify(chunk.data),
                    id: `${chunk.type}-${Date.now()}`
                })
                if(chunk.type == "complete") stream.close()
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
