import { Context, Hono } from "hono";
import { addSessionDetails, authMiddleware } from "../middlewares/auth";
import { SubscriptionsController } from "../controllers/subscriptions.controller";
import { StatusCodes } from "../utils/statusCodes";
import { paymentGateway, PaymentGateway } from "../services/PaymentGateway/paymentGateway";

const subscriptionsRouter = new Hono()

//Doesnt require any auth
subscriptionsRouter.get("/products", async (c : Context) => {
    const products = await paymentGateway.getSubscriptionProducts()

    return c.json({products : products.items}, StatusCodes.OK)
})

subscriptionsRouter.use('*', authMiddleware)
subscriptionsRouter.use('*', addSessionDetails)

/*
Get the current subscription details of a user
*/
subscriptionsRouter.get("/", async (c : Context)=> {
    const userId = c.get('userId')

    const subscriptions = await SubscriptionsController.getUserSubscriptionDetails(userId)

    return c.json({subscriptions : subscriptions},StatusCodes.OK)
})

/*
Creates a new subscription
requires userId from header 
requires productId from url - path params
*/
subscriptionsRouter.get("/create/:product_id", async (c : Context)=> {
    const userId = c.get('userId')
    const productId = c.req.param('product_id')
    const discountCode = c.req.query('discount_id')

    if (!productId) {
        return c.json({ error: "Missing product id" }, StatusCodes.BAD_REQUEST)
    }

    try{
        const paymentDetails = await SubscriptionsController.generateNewPaymentLink(userId, productId, discountCode)
        return c.json(paymentDetails, StatusCodes.OK)
    }catch(err : any){
        return c.json({ error: err.error , message: "Invalid Discount Code!"}, StatusCodes.NOT_FOUND)
    }

})

/*
Upgrade or downgrade a subscription
requires new productId & subscriptionId from body
*/
subscriptionsRouter.post("/change_plan", async (c : Context) => {
    const body = await c.req.json<{
        productId: string
        subscriptionId: string
    }>()

    const { productId, subscriptionId } = body

    if (!productId || !subscriptionId) {
      return c.json({ error: "Missing productId or subscriptionId" }, StatusCodes.BAD_REQUEST)
    }

    await paymentGateway.changePlan(subscriptionId, productId)

    return c.json({ message: "Your new plan will be activated shortly. Thank you for supporting our community!" }, StatusCodes.OK)
})


subscriptionsRouter.delete("/:subscription_id", async (c: Context)=>{
    const subscriptionId = c.req.param('subscription_id')

    if (!subscriptionId) {
        return c.json({ error: "Missing subscriptionId" }, StatusCodes.BAD_REQUEST)
    }

    await paymentGateway.cancelSubscription(subscriptionId)

    return c.json({ message: "We're sad to see you go, but deeply thankful for the time you spent with us. If you ever decide to return, we’ll be here with open arms." }, StatusCodes.OK)
})


subscriptionsRouter.get("/transaction_history", async (c : Context)=>{
    const userId = c.get('userId')

    const transactionHistory = await SubscriptionsController.getUsersTransactionHistory(userId)
    return c.json({transactions : transactionHistory}, StatusCodes.OK)
})

export default subscriptionsRouter


