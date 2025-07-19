
import { Context, Hono } from "hono";
import { SubscriptionsController } from "../controllers/subscriptions.controller";
import { verifyDodoPaymentsWebHook } from "../middlewares/verify.webhooks";
import { StatusCodes } from "../utils/statusCodes";
import { DodoWebhookPayload, PaymentData, SubscriptionData } from "../services/PaymentGateway/models";
import { sendWhatsappAlert } from "../utils/utility_methods";
import { UserController } from "../controllers/user.controller";

const webhookRouter = new Hono();

// This webhook is for Clerk Auth, when a new user signs up.
webhookRouter.post("/user/signup",UserController.userSignUp);

/*
There is a loophole in the subscription tier logic:
Suppose Basic Tier allows to store upto 100 notes in knowledge base,
User can Take subscription for 1 month, store 100 + notes (say 250) & then cancel the subscription.
    - Now although he cannot store further notes into the knowledge base, but he can still have 100+ notes in his knowledge base, while staying in Basic Tier.
*/

webhookRouter.post("/user/subscriptionEvents",verifyDodoPaymentsWebHook, async (c: Context)=> {
    try{

        const payload = await c.req.json<DodoWebhookPayload>()
    
        //TODO: Handle the Payload events
        console.log("Received Subscription Event:", payload.type);
        switch(payload.type){
            case "subscription.active":
                //Indicates that a subscription has been activated and recurring charges are scheduled.
            case "subscription.renewed":
                //Indicates successfull renewal of the subscription.
                await SubscriptionsController.RenewUserSubscription(payload.data as SubscriptionData)
    
                break;
            case "subscription.on_hold":
                //Indicates that the subscription has been put on hold as renewal payment was pending / unsuccessfull.
            case "subscription.paused":
                //Occurs when the subscription is paused, I dont know when this happens.
                await SubscriptionsController.PauseUserSubscription(payload.data as SubscriptionData)
    
                break
            case "subscription.plan_changed":
                //Occurs when the user upgrades / downgrades the subscription plan.
                await SubscriptionsController.ChangeUserSubscriptionPlan(payload.data as SubscriptionData)
    
                break
            case "subscription.expired":
                //Occurs when the subscription reaches end of its term and no more payments are scheduled.
            case "subscription.failed":
                //Indicates that Dodo failed to create the mandate, failed subscription.
            case "subscription.cancelled":
                //Occurs when the subsciption is cancelled by the merchant or customer
                await SubscriptionsController.CancelUserSubscription(payload.data as SubscriptionData)
    
                break;
            // TODO: Do we need to handle these payment events? or just handling the subscription events is good enough?
            // As it seems like these events are helpful to follow up the user.
            case "payment.succeeded":
                //Triggered when a payment is successfully processed.
            case "payment.failed":
                //Occurs when a payment attempt fails due to errors, declined cards, or other issues.
            case "payment.processing":
                //	Indicates that a payment is currently being processed.
            case "payment.cancelled":
                //Triggred when a payment is cancelled before completion.
                await SubscriptionsController.AuditUserPayments(payload.data as PaymentData)
                break;
            /*
                Ignoring the refund events for now, as we are not handling 
            */
    
            default:
                //TODO: Somehow notify urself that there is an unexpected event.
                console.log("Unknown event type:", payload.type);
        }
    
        return c.json({ received: true }, StatusCodes.OK)
    }catch(err){
        let errorMessage = `Some Error Occurred in Dodo Payments Webhook Controller.\n${await c.req.json()}.\n\nError: ${err}`

        await sendWhatsappAlert(errorMessage)
        //TODO: Find a way to notify yourself.
        return c.json({ error: `Some Error Occurred in Dodo Payments Webhook Controller. Error: ${err}` }, StatusCodes.INTERNAL_SERVER_ERROR)
    }
})

export default webhookRouter;
