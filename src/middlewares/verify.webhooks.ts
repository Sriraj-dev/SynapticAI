import { MiddlewareHandler } from "hono";
import { StatusCodes } from "../utils/statusCodes";
import {Webhook} from "standardwebhooks"
import {isEqual} from "lodash"

const WEBHOOK_SECRET = process.env.DODO_PAYMENTS_WEBHOOK_SECRET || ''

export const verifyDodoPaymentsWebHook : MiddlewareHandler = async (c, next) => {
    
    try{
        const webhook = new Webhook(WEBHOOK_SECRET);

        // Step 1: Get raw body
        const rawBody = await c.req.text();

        // Step 2: Parse body from raw string 
        const body = JSON.parse(rawBody);

        // Step 3: Extract headers
        const webhookHeaders = {
            "webhook-id": c.req.header("webhook-id") || "",
            "webhook-signature": c.req.header("webhook-signature") || "",
            "webhook-timestamp": c.req.header("webhook-timestamp") || "",
        };

        // Step 4: Verify using SDK or crypto
        const verifiedPayload = await webhook.verify(rawBody, webhookHeaders);

        //Verify Signature
        if(isEqual(verifiedPayload, body)){
            console.log("✅ Valid WebHook Signature")
            await next()
        }else{
            console.log("❌ Invalid WebHook Signature")
            return c.text('Invalid Signature', StatusCodes.UNAUTHORIZED)
        }

    }catch(err){
        return c.json({error: "Invalid Signature"}, StatusCodes.UNAUTHORIZED)
    }
}