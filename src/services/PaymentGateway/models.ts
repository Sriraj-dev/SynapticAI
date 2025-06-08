
export interface DodoWebhookPayload{
    business_id: string;
    type: string;
    timestamp: string;
    data : SubscriptionData | PaymentData
}

export interface SubscriptionData{
    payload_type: string
    subscription_id: string
    recurring_pre_tax_amount: number
    tax_inclusive: boolean
    currency: string
    status: string
    created_at: string
    product_id: string
    quantity: number
    trial_period_days: number
    subscription_period_interval: string
    payment_frequency_interval: string
    subscription_period_count: number
    payment_frequency_count: number
    next_billing_date: string
    previous_billing_date: string
    customer: {
        customer_id: string
        name: string
        email: string
    }
    metadata: {
        userId: string
        productId: string
    }
    discount_id: any
    cancelled_at: any
    cancel_at_next_billing_date: boolean
    billing: {
        country: string
        state: string
        city: string
        street: string
        zipcode: string
    }
    on_demand: boolean
    addons: any[]
}

export interface PaymentData{
    payload_type: string
    payment_id: string
    business_id: string
    status: string
    total_amount: number
    currency: string
    payment_method: string
    payment_method_type: any
    created_at: string
    updated_at: any
    disputes: any[]
    refunds: any[]
    customer: {
        customer_id: string
        name: string
        email: string
    }
    subscription_id: string
    product_cart: any
    payment_link: string
    tax: any
    metadata: {
        productId: string
        userId: string
    }
    error_message: string
    error_code: string
    discount_id: any
    settlement_amount: number
    settlement_tax: any
    settlement_currency: string
    billing: {
        country: string
        state: string
        city: string
        street: string
        zipcode: string
    }      
    card_last_four: string
    card_issuing_country: string
    card_type: string
    card_network: string
    brand_id: string
}


// export interface SubscriptionPayload extends DodoWebhookPayload<SubscriptionData> {}
// export interface PaymentPayload extends DodoWebhookPayload<PaymentData> {}

