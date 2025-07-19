import { and, eq, ne } from "drizzle-orm";
import { db } from "../db";
import { payments, subscriptions, SubscriptionStatus } from "../db/schema";
import { PaymentData, SubscriptionData } from "../services/PaymentGateway/models";
import { NewUserSubscription } from "../utils/models";


export const SubscriptionsRepository = {

    //TODO: These 2 tables might require indexing on userId.
    async getUserSubscriptionDetails(userId: string){
        const subscriptionDetails = await db.select().from(subscriptions).where(and(
            eq(subscriptions.user_id, userId),
            ne(subscriptions.subscription_status, SubscriptionStatus.CANCELLED),
            ne(subscriptions.subscription_status, SubscriptionStatus.FAILED)
        ))

        return subscriptionDetails
    },

    async getUsersTransactionHistory(userId : string){
        const history = await db.select().from(payments).where(eq(payments.user_id, userId))

        return history
    },

    async createNewSubscription(data : SubscriptionData){
        const userId = data.metadata.userId;
        const subscriptionId = data.subscription_id;
        
        const subscription = await db.insert(subscriptions).values({
            subscription_id: subscriptionId,
            customer_id: data.customer.customer_id,
            product_id: data.product_id,
            discount_id: data.discount_id,
            user_id: userId,

            username: data.customer.name,
            email: data.customer.email,
            subscription_status: data.status,

            pre_tax_amount: data.recurring_pre_tax_amount.toString(),
            previous_billing_date: new Date(data.previous_billing_date),
            next_billing_date: new Date(data.next_billing_date),
            cancel_at_next_billing_date: data.cancel_at_next_billing_date,

            payment_frequency_interval: data.payment_frequency_interval,
            subscription_period_interval: data.subscription_period_interval,
            subscription_period_count: 
            data.subscription_period_count,

            created_at: new Date(data.created_at),
            updated_at: new Date()

        } as NewUserSubscription).returning()

        return subscription[0]
    },

    async updateSubscriptionDetails(data: SubscriptionData, reason : string =""){
        const subscriptionId = data.subscription_id;
        const userId = data.metadata.userId;

        const subscription = await db.update(subscriptions).set({
            customer_id: data.customer.customer_id,
            product_id: data.product_id, //When upgrading or downgrading the subscription, product Id might change.
            discount_id: data.discount_id,
            user_id: userId,
            username: data.customer.name,
            email: data.customer.email,
            //Usually the values above will never change for a particular subscriptionId, but just added to be safe

            subscription_status: data.status,
            reason: reason,

            pre_tax_amount: data.recurring_pre_tax_amount.toString(),
            previous_billing_date: new Date(data.previous_billing_date),
            next_billing_date: new Date(data.next_billing_date),
            cancel_at_next_billing_date: data.cancel_at_next_billing_date,

            payment_frequency_interval: data.payment_frequency_interval,
            subscription_period_interval: data.subscription_period_interval,
            subscription_period_count: 
            data.subscription_period_count,

            created_at: new Date(data.created_at),
            updated_at: new Date()
        }).where(eq(subscriptions.subscription_id, subscriptionId)).returning()

        return subscription[0]
    },

    async capturePaymentTransaction(payment: PaymentData){
        await db.insert(payments).values({
            payment_id: payment.payment_id,
            subscription_id: payment.subscription_id,
            discount_id: payment.discount_id ?? null,
            customer_id: payment.customer.customer_id,
            user_id: payment.metadata.userId,
          
            status: payment.status,
            error_message: payment.error_message ?? null,
            error_code: payment.error_code ?? null,
          
            total_amount: payment.total_amount.toString(),
            tax: payment.tax?.toString() ?? "0.00",
          
            payment_link: payment.payment_link,
            payment_method: payment.payment_method,
            payment_method_type: payment.payment_method_type ?? null,
            currency: payment.currency,
          
            created_at: new Date(payment.created_at),
            updated_at: new Date(),
          })
          .onConflictDoUpdate({
            target: payments.payment_id,
            set: {
              status: payment.status,
              error_message: payment.error_message ?? null,
              error_code: payment.error_code ?? null,
          
              total_amount: payment.total_amount.toString(),
              tax: payment.tax?.toString() ?? "0.00",

              payment_link: payment.payment_link,

              payment_method: payment.payment_method,
              payment_method_type: payment.payment_method_type ?? null,
              currency: payment.currency,

              updated_at: new Date(),
            }
          });
    }


}