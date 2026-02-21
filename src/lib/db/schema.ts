import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  jsonb,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const customerSegmentEnum = pgEnum('customer_segment', [
  'champion',
  'loyal',
  'potential',
  'new',
  'at_risk',
  'hibernating',
  'lost',
])

export const triggerTypeEnum = pgEnum('trigger_type', [
  'first_order',
  'segment_change',
  'days_since_order',
  'tag_added',
  'cart_abandoned',
])

export const actionTypeEnum = pgEnum('action_type', [
  'send_email',
  'add_tag',
  'remove_tag',
])

export const messageChannelEnum = pgEnum('message_channel', ['email', 'sms'])

export const messageStatusEnum = pgEnum('message_status', [
  'sent',
  'opened',
  'clicked',
  'converted',
  'suppressed',
  'failed',
])

export const suppressionReasonEnum = pgEnum('suppression_reason', [
  'hard_bounce',
  'unsubscribe',
  'manual',
])

export const financialStatusEnum = pgEnum('financial_status', [
  'pending',
  'authorized',
  'paid',
  'refunded',
  'voided',
])

export const syncStatusEnum = pgEnum('sync_status', [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: varchar('shop_id', { length: 255 }).notNull(),
    shopifyId: varchar('shopify_id', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    rfmR: integer('rfm_r'),
    rfmF: integer('rfm_f'),
    rfmM: integer('rfm_m'),
    segment: customerSegmentEnum('segment'),
    lifecycleStage: varchar('lifecycle_stage', { length: 100 }),
    marketingOptedOut: boolean('marketing_opted_out').default(false).notNull(),
    tags: text('tags').array(),
    totalSpent: numeric('total_spent', { precision: 19, scale: 4 }),
    orderCount: integer('order_count').default(0),
    avgOrderValue: numeric('avg_order_value', { precision: 19, scale: 4 }),
    firstOrderAt: timestamp('first_order_at', { withTimezone: true }),
    lastOrderAt: timestamp('last_order_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    shopifyCreatedAt: timestamp('shopify_created_at', { withTimezone: true }),
    shopifyUpdatedAt: timestamp('shopify_updated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('customers_shop_id_idx').on(table.shopId),
    index('customers_shopify_id_idx').on(table.shopifyId),
    index('customers_segment_idx').on(table.segment),
    index('customers_email_idx').on(table.email),
    // Unique composite for upsert target — required by onConflictDoUpdate
    // NOTE: A proper unique index migration should be applied to production DB
    uniqueIndex('customers_shop_shopify_unique').on(table.shopId, table.shopifyId),
  ]
)

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: varchar('shop_id', { length: 255 }).notNull(),
    shopifyId: varchar('shopify_id', { length: 255 }).notNull(),
    customerId: uuid('customer_id').references(() => customers.id),
    totalPrice: numeric('total_price', { precision: 19, scale: 4 }),
    lineItems: jsonb('line_items'),
    financialStatus: financialStatusEnum('financial_status'),
    isHistorical: boolean('is_historical').default(false).notNull(),
    shopifyCreatedAt: timestamp('shopify_created_at', { withTimezone: true }),
    shopifyUpdatedAt: timestamp('shopify_updated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('orders_shop_id_idx').on(table.shopId),
    index('orders_customer_id_idx').on(table.customerId),
    index('orders_created_at_idx').on(table.createdAt),
    // Unique composite for upsert target — required by onConflictDoUpdate
    // NOTE: A proper unique index migration should be applied to production DB
    uniqueIndex('orders_shop_shopify_unique').on(table.shopId, table.shopifyId),
  ]
)

export const automations = pgTable(
  'automations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: varchar('shop_id', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    triggerType: triggerTypeEnum('trigger_type').notNull(),
    triggerConfig: jsonb('trigger_config'),
    delayValue: integer('delay_value'),
    delayUnit: varchar('delay_unit', { length: 50 }),
    actionType: actionTypeEnum('action_type').notNull(),
    actionConfig: jsonb('action_config'),
    emailTemplateId: varchar('email_template_id', { length: 255 }),
    enabled: boolean('enabled').default(true).notNull(),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('automations_shop_id_idx').on(table.shopId),
    index('automations_enabled_idx').on(table.enabled),
    // Unique composite for upsertAutomation target — name is stable preset identifier
    uniqueIndex('automations_shop_name_unique').on(table.shopId, table.name),
  ]
)

export const messageLogs = pgTable(
  'message_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: varchar('shop_id', { length: 255 }).notNull(),
    customerId: uuid('customer_id').references(() => customers.id),
    automationId: uuid('automation_id').references(() => automations.id),
    channel: messageChannelEnum('channel').notNull(),
    subject: varchar('subject', { length: 500 }),
    status: messageStatusEnum('status').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    clickedAt: timestamp('clicked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('message_logs_shop_id_idx').on(table.shopId),
    index('message_logs_customer_id_idx').on(table.customerId),
    index('message_logs_automation_id_idx').on(table.automationId),
    index('message_logs_status_idx').on(table.status),
  ]
)

export const syncLogs = pgTable(
  'sync_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: varchar('shop_id', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    status: syncStatusEnum('status').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    customersCount: integer('customers_count').default(0),
    ordersCount: integer('orders_count').default(0),
    errorMessage: text('error_message'),
    cursor: text('cursor'),
    bulkOperationId: varchar('bulk_operation_id', { length: 255 }),
  },
  (table) => [
    index('sync_logs_shop_id_idx').on(table.shopId),
    index('sync_logs_status_idx').on(table.status),
    index('sync_logs_started_at_idx').on(table.startedAt),
  ]
)

export const suppressions = pgTable(
  'suppressions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: varchar('shop_id', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    reason: suppressionReasonEnum('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('suppressions_shop_id_idx').on(table.shopId),
    uniqueIndex('suppressions_shop_email_unique').on(table.shopId, table.email),
  ]
)

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shopId: varchar('shop_id', { length: 255 }).notNull(),
    webhookId: varchar('webhook_id', { length: 255 }).notNull(),
    topic: varchar('topic', { length: 100 }).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    status: varchar('status', { length: 50 }).notNull().default('processed'),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').default(0),
  },
  (table) => [
    index('webhook_deliveries_shop_id_idx').on(table.shopId),
    uniqueIndex('webhook_deliveries_shop_webhook_unique_idx').on(
      table.shopId,
      table.webhookId
    ),
    index('webhook_deliveries_topic_idx').on(table.topic),
  ]
)
