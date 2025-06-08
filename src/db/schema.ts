import { relations, sql } from "drizzle-orm";
import { bigint, boolean, decimal, index } from "drizzle-orm/pg-core";
import { uuid } from "drizzle-orm/pg-core";
import { integer } from "drizzle-orm/pg-core";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export enum SubscriptionTier {
    Basic = 'Basic',
    Advanced = 'Advanced',
    Elite = 'Elite'
}

export enum SubscriptionStatus {
    ACTIVE = "active",
    PENDING = "pending",
    ONHOLD = "on_hold",
    PAUSED = "paused",
    CANCELLED = "cancelled",
    FAILED = "failed",
    EXPIRED = "expired"
}

export enum PaymentStatus {
    Succeeded = 'succeeded',
    Failed = 'failed',
    Cancelled = 'cancelled',
    Processing = 'processing',
    RequiresCustomerAction = 'requires_customer_action',
    RequiresMerchantAction = 'requires_merchant_action',
    RequiresPaymentMethod = 'requires_payment_method',
    RequiresConfirmation = 'requires_confirmation',
    RequiresCapture = 'requires_capture',
    PartiallyCaptured = 'partially_captured',
    PartiallyCapturedAndCapturable = 'partially_captured_and_capturable'
}

export enum AccessLevel{
    Owner = 'Owner',
    View = 'View',
    Edit = 'Edit',
    Denied = 'Denied'
}

export enum AccessStatus{
    Granted = 'Granted',
    Pending = 'Pending',
    Denied = 'Denied'
}

export enum TaskStatusLevel{
    Backlog = 'Backlog',
    Next = 'Next',
    Blocked = 'Blocked',
    InProgress = 'InProgress',
    Completed = 'Completed',
}

export enum NoteStatusLevel{
    Creating = 'Creating',
    Memorizing = 'Memorizing',
    Updating = 'Updating',
    Completed = 'Completed',
    FailedToMemorize = 'Failed To Memorize',
    FailedToCreate = 'Failed To Create',
}

export enum NoteStatusReason {
    Error = "Something went wrong while memorizing your note. We're on it — please try again shortly.",
    
    UserCancelled = "You cancelled the request. No worries — you can always try again later!",
    
    TokenLimitReached = "Whoa! You’ve maxed out your AI memory space. Upgrade your plan to keep the momentum going!",
    
    MemoryLimitReached = "You’ve reached your memory limit for this plan. Upgrade to store more insights and ideas.",
    
    Other = "We ran into an issue while saving your note. Please try again in a bit.",
}

// Users Table
export const users = pgTable("users", {
  uid : text().primaryKey(),
  username: text().notNull().unique(),
  email: text(),
  name: text(),
  phone: text(),
  memories: text(),
  subscription_tier : text().notNull().default(SubscriptionTier.Basic),
  amount_paid : decimal("amount_paid", { mode: "number" }).notNull().default(0),
  subscription_start_date : timestamp().notNull().defaultNow(),
  subscription_end_date : timestamp(),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow(),
});

//Create a index on userId as well.
//Subscriptions Table:
export const subscriptions = pgTable("subscriptions", {
    subscription_id: text().primaryKey().notNull(),
    customer_id: text().notNull(),
    product_id: text().notNull(),
    discount_id: text(),
    user_id: text().references(() => users.uid).notNull(),

    username: text(),
    email: text(),
    quantity: integer().default(1),
    subscription_status: text().notNull().default(SubscriptionStatus.ACTIVE),
    reason: text(), // TODO: How to decide reason? 
    pre_tax_amount: decimal("pre_tax_amount", { mode: "string" }).notNull(),
    previous_billing_date: timestamp("previous_billing_date", {withTimezone: true}).notNull(),
    next_billing_date: timestamp("next_billing_date", {withTimezone: true}),
    cancel_at_next_billing_date: boolean().default(false),
    cancelled_at: timestamp(),

    payment_frequency_interval: text().notNull().default("Month"),
    subscription_period_interval: text().notNull().default("Year"),
    subscription_period_count: integer().notNull().default(10),

    created_at: timestamp("created_at", {withTimezone: true}).notNull(),
    updated_at: timestamp("updated_at", {withTimezone: true}).notNull(),
}, (table) => ({
    userIdIndex : index("idx_subscriptions_user_id").on(table.user_id)
}))

export const payments = pgTable("payments", {
    payment_id: text().primaryKey().notNull(),
    subscription_id: text().notNull(),
    discount_id: text(),
    customer_id : text().notNull(),
    user_id: text().references(()=> users.uid).notNull(),

    status: text().notNull().default(PaymentStatus.Succeeded),
    error_message: text(),
    error_code: text(),

    total_amount: decimal("pre_tax_amount", { mode: "string" }).default("0.00"),
    tax : decimal("tax", { mode: "string" }).default("0.00"),

    payment_link: text(),
    payment_method: text(),
    payment_method_type: text(),
    currency: text(),


    created_at: timestamp().defaultNow(),
    updated_at: timestamp().defaultNow(),
}, (table) => ({
    userIdIndex : index("idx_payments_user_id").on(table.user_id)
}))

//notes table
export const notes = pgTable("notes", {
  uid: uuid().defaultRandom().primaryKey(),
  owner_id: text().references(() => users.uid, {onDelete: "cascade"}).notNull(),
  folder: text().default("All"),
  title: text(),
  content: text().notNull(), //HTML, JSON or Plain Text
  status: text().notNull().default(NoteStatusLevel.Creating),
  reason: text(), //Reason for the status change, if any.
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow(),
})

//embeddings table
/*
Look at ./vectordb_schema.ts
*/

//TODO: Update token limits in userUsageMetrics based on subscription tier
export const userUsageMetrics = pgTable("user_usage_metrics", {
    userId: text().primaryKey().references(() => users.uid, {onDelete: "cascade"}).notNull(),
    subscription_tier: text().notNull().default(SubscriptionTier.Basic), //TODO: We can remove this column if not required.

    total_embedded_tokens: integer().default(0).notNull(),
    embedded_tokens_limit: integer().default(10000).notNull(),

    total_chat_tokens: integer().default(0).notNull(),
    today_chat_tokens: integer().default(0).notNull(),
    daily_chat_tokens_limit: integer().default(5000).notNull(), // TODO: Decide the token limit for chat

    total_voice_tokens: integer().default(0).notNull(),
    today_voice_tokens: integer().default(0).notNull(),
    daily_voice_tokens_limit: integer().default(700).notNull(), // TODO: Decide the token limit for voice

    total_internet_calls: integer().default(0).notNull(),
    today_internet_calls: integer().default(0).notNull(),
    daily_internet_calls_limit: integer().default(10).notNull(), // TODO: Decide the limit for internet calls

    total_semantic_queries: integer().default(0).notNull(),
    today_semantic_queries: integer().default(0).notNull(),
    daily_semantic_queries_limit: integer().default(10).notNull(), //TODO: (if requried) Decide the limit for semantic queries

    lastResetAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().notNull(),
})

//noteAccess Table
export const noteAccess = pgTable("note_access",{
    uid: uuid("id").defaultRandom().primaryKey(),
    note_id: uuid().references(() => notes.uid, {onDelete: "cascade"}).notNull(),
    owner_id: text().references(() => users.uid, {onDelete: "cascade"}).notNull(),
    user_id: text().references(() => users.uid, {onDelete: "cascade"}),
    access_level: text().notNull(),
    status: text().notNull().default(AccessStatus.Pending),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow(),
})

//Tasks Table
export const tasks = pgTable("tasks", {
  uid: uuid().defaultRandom().primaryKey(),
  owner_id: text().references(() => users.uid, {onDelete: "cascade"}).notNull(),
  title: text().notNull(),
  content: text(),
  status: text().notNull().default(TaskStatusLevel.Next),
  time_logged: integer().default(0),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow(),
})

//Table Relations
export const usersRelations = relations(users, ({ many }) => ({
    notes: many(notes),
    tasks: many(tasks),
    noteAccess: many(noteAccess),
}))

export const notesRelations = relations(notes, ({ one, many }) => ({
    owner: one(users, {
        fields: [notes.owner_id],
        references: [users.uid],
    }),
    noteAccess: many(noteAccess),
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
    owner: one(users, {
        fields: [tasks.owner_id],
        references: [users.uid],
    }),
}))
