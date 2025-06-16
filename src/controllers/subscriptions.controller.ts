import { UsersRepository } from "../repositories/users.repository";
import { SubscriptionLimits } from "../utils/models";
import { PaymentData, SubscriptionData } from "../services/PaymentGateway/models";
import { db } from "../db";
import { subscriptions, SubscriptionTier, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { SubscriptionsRepository } from "../repositories/subscriptions.repository";
import { paymentGateway, PaymentGateway } from "../services/PaymentGateway/paymentGateway";
import { UserController } from "./user.controller";


export const SubscriptionsController = {

    async generateNewPaymentLink(userId: string, productId: string, discountCode?: string){
        try{

            const user = await UserController.getUser(userId)
    
            const paymentDetails = await paymentGateway.generatePaymentLink(userId, user?.username ?? "" ,user?.email ?? "", productId, discountCode)
    
            return paymentDetails
        }catch(err){
            console.error('Could not generate the payment link. UserId : ', userId)
            console.error("Error : ", err)
            throw err
        }
    },

    async getUserSubscriptionDetails(userId: string){
        try{
            const subscriptionDetails = await SubscriptionsRepository.getUserSubscriptionDetails(userId)

            return subscriptionDetails
        }catch(err){
            console.error('Could not get the users subscription details. UserId : ', userId)
            throw err
        }
    },

    async getUsersTransactionHistory(userId : string){
        try{
            const transactionHistory = await SubscriptionsRepository.getUsersTransactionHistory(userId)

            return transactionHistory
        }catch(err){
            console.error('Could not get the users transaction history. UserId : ', userId)
            throw err
        }
    },

    //Handles new subscriptions and renewed subscriptions.
    async RenewUserSubscription(data: SubscriptionData){
        try{
            const userId = data.metadata.userId
            const subscriptionId = data.subscription_id

            //1. Create or Update the subscriptions table.
            let userSubscriptions = await db.select().from(subscriptions).where(eq(subscriptions.subscription_id, subscriptionId))

            if(userSubscriptions.length === 0){
                console.log("🤩 New Subscription Received!")
                await SubscriptionsRepository.createNewSubscription(data)
            }else{
                console.log("Renewal Amount Received!")
                await SubscriptionsRepository.updateSubscriptionDetails(data)
            }

            //2. Get the subscription plan using the product id from dodo payments.
            const plan = await paymentGateway.getProductDetails(data.product_id)
            let subscriptionTier : SubscriptionTier = plan.name?.split(" ")[0] as SubscriptionTier
            
            //3. Update the user table with subscription start and end_date -- optional.
            //Anyways we are not using this data from users table
            // await UsersRepository.updateUserDetails({
            //     subscription_start_date: new Date(data.previous_billing_date),
            //     subscription_end_date: new Date(data.next_billing_date),
            //     subscription_tier: subscriptionTier,
            // } as User)

            //4. Update the user metrics table as per the subscription plan.
            await UsersRepository.updateUserUsageMetricsLimit(userId, subscriptionTier,SubscriptionLimits[subscriptionTier].embedded_tokens_limit,
                SubscriptionLimits[subscriptionTier].daily_chat_tokens_limit,
                SubscriptionLimits[subscriptionTier].daily_voice_tokens_limit,
                SubscriptionLimits[subscriptionTier].daily_internet_calls_limit,
                SubscriptionLimits[subscriptionTier].daily_semantic_queries_limit,
            )

        }catch(err){
            console.error(`❌ Error in RenewUserSubscription. subscriptionId : ${data.subscription_id}. Error: `, err)
            throw err
        }

    },


    //Handles on_hold due to renewal payment failures or some other reason, due to which user couldnt pay for the subscription.
    async PauseUserSubscription(data: SubscriptionData){
        try{
            const userId = data.metadata.userId

            //1. Update the subscriptions table with status as on_hold or paused or failed etc.
            await SubscriptionsRepository.updateSubscriptionDetails(data, "Unable to Renew your Subscription. Please verify your payment status.")

            //2. Update the userMetrics back to Basic Tier.
            await UsersRepository.updateUserUsageMetricsLimit(userId, SubscriptionTier.Basic,
                SubscriptionLimits.Basic.embedded_tokens_limit,
                SubscriptionLimits.Basic.daily_chat_tokens_limit,
                SubscriptionLimits.Basic.daily_voice_tokens_limit,
                SubscriptionLimits.Basic.daily_internet_calls_limit,
                SubscriptionLimits.Basic.daily_semantic_queries_limit,
            )
        }catch(err){
            console.error(`❌ Error in PauseUserSubscription. subscriptionId : ${data.subscription_id}. Error: `, err)
            throw err
        }
    },

    //When the user Upgrades or Downgrades the subscription plan, we need to update the user metrics accordingly.
    async ChangeUserSubscriptionPlan(data : SubscriptionData){
        try{
            const userId = data.metadata.userId

            await SubscriptionsRepository.updateSubscriptionDetails(data)

            const plan = await paymentGateway.getProductDetails(data.product_id)
            let subscriptionTier : SubscriptionTier = plan.name?.split(" ")[0] as SubscriptionTier

            await UsersRepository.updateUserUsageMetricsLimit(userId, subscriptionTier,SubscriptionLimits[subscriptionTier].embedded_tokens_limit,
                SubscriptionLimits[subscriptionTier].daily_chat_tokens_limit,
                SubscriptionLimits[subscriptionTier].daily_voice_tokens_limit,
                SubscriptionLimits[subscriptionTier].daily_internet_calls_limit,
                SubscriptionLimits[subscriptionTier].daily_semantic_queries_limit,
            )

        }catch(err){
            console.error(`❌ Error in ChangeUserSubscriptionPlan. subscriptionId : ${data.subscription_id}. Error: `, err)
            throw err
        }
    },

    //Handles user cancellation and expired subscriptions, Also when subscription fails.
    async CancelUserSubscription(data : SubscriptionData){
        try{
            const userId = data.metadata.userId

            await SubscriptionsRepository.updateSubscriptionDetails(data)

            //2. Update the userMetrics back to Basic Tier.
            await UsersRepository.updateUserUsageMetricsLimit(userId, SubscriptionTier.Basic,
                SubscriptionLimits.Basic.embedded_tokens_limit,
                SubscriptionLimits.Basic.daily_chat_tokens_limit,
                SubscriptionLimits.Basic.daily_voice_tokens_limit,
                SubscriptionLimits.Basic.daily_internet_calls_limit,
                SubscriptionLimits.Basic.daily_semantic_queries_limit,
            )
        }catch(err){
            console.error(`❌ Error in CancelUserSubscription. subscriptionId : ${data.subscription_id}. Error: `, err)
            throw err
        }
    },

    /*
        This is only for auditing purposes, we store all the payment transactions in the database.
    */
    async AuditUserPayments(data: PaymentData){
        try{
            await SubscriptionsRepository.capturePaymentTransaction(data)
        }catch(err){
            console.error(`❌ Could not capture payment transaction, paymentId : ${data.payment_id}. Error: ${err}`)
            throw err
        }
    }
    
}