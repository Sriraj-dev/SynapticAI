import { SubscriptionChangePlanParams } from "dodopayments/resources/subscriptions.mjs";
import "../../config/env"
import Dodopayments from 'dodopayments'


export class PaymentGateway{

    private client : Dodopayments;

    constructor(){
        console.log("API KEY : ", process.env.DODO_PAYMENTS_API_KEY)
        this.client = new Dodopayments({
            bearerToken: process.env.DODO_PAYMENTS_API_KEY,
            environment: process.env.ENVIRONMENT == "PROD" ? 'live_mode' : 'test_mode',
        })
    }

    public async generatePaymentLink(userId:string,username: string, email: string, productId: string, discountId?:string){
        const subscription = await this.client.subscriptions.create({
            customer: {
                email: email,
                name: username,
            },
            allowed_payment_method_types:['upi_collect', 'upi_intent', 'apple_pay', 'google_pay', 'debit'],
            // allowed_payment_method_types: [
            //     // 'credit'
            //     // 'debit'
            //     ,'upi_collect'
            //     ,'upi_intent'
            //     ,'apple_pay'
            //     // ,'cashapp'
            //     ,'google_pay'
            //     // ,'multibanco'
            //     // ,'bancontact_card'
            //     // ,'eps'
            //     // ,'ideal'
            //     // ,'przelewy24'
            //     // ,'affirm'
            //     // ,'klarna'
            //     // ,'sepa'
            //     // ,'ach'
            //     ,'amazon_pay'
            //     // ,'afterpay_clearpay'
            // ],
            product_id: productId,
            payment_link: true,
            quantity: 1,
            return_url: "https://synapticai.app",
            billing: { city: 'city', country: 'IN', state: 'state', street: 'street', zipcode: "500090" },
            metadata: { userId: userId, productId: productId },
            discount_code: discountId ?? null
        })

        return subscription
    }

    public async changePlan(subscriptionId : string, productId :string){
        await this.client.subscriptions.changePlan(subscriptionId,
            {
                product_id: productId,
                quantity:1, 
                proration_billing_mode : 'prorated_immediately'
            })
    }

    public async getSubscriptionDetails(subscriptionId : string){
        const details = await this.client.subscriptions.retrieve(subscriptionId)
        console.log(details)

        return details
    }

    public async getSubscriptionProducts(){
        const products = await this.client.products.list()

        return products
    }

    public async getProductDetails(productId : string){
        const details = await this.client.products.retrieve(productId)

        return details
    }

    public async cancelSubscription(subscriptionId : string){
        await this.client.subscriptions.update(subscriptionId,{status: "cancelled"})
    }

}

export const paymentGateway = new PaymentGateway()
