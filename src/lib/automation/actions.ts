import React from 'react'
import { env } from '@/lib/env'
import { sendMarketingEmail } from '@/lib/email/send'
import { shopifyGraphQL } from '@/lib/shopify/client'
import { getCustomerByInternalId } from '@/lib/db/queries'
import Decimal from 'decimal.js'
import WelcomeEmail from '@/emails/welcome'
import AbandonedCartEmail from '@/emails/abandoned-cart'
import RepurchaseEmail from '@/emails/repurchase'
import WinbackEmail from '@/emails/winback'
import VipEmail from '@/emails/vip'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailActionParams {
  shopId: string
  customerId: string       // internal UUID
  automationId: string
  emailTemplateId: string
  eventTimestamp: string   // ISO string, used in idempotency key
  actionConfig?: Record<string, unknown> | null
}

// ─── ActionConfig override shape ──────────────────────────────────────────────

interface ActionConfigOverrides {
  subject?: string
  headline?: string
  body?: string
  ctaText?: string
  discountCode?: string
  alsoAddTag?: string
}

// ─── Subject map ──────────────────────────────────────────────────────────────

const SUBJECT_MAP: Record<string, string> = {
  'welcome':        'Welcome to our store!',
  'abandoned-cart': 'You left something behind...',
  'repurchase':     'Time to reorder?',
  'winback':        "We miss you — here's an offer",
  'vip':            'Welcome to the VIP club',
}

// ─── Email action executor ────────────────────────────────────────────────────

/**
 * Execute an email action for an automation.
 *
 * - Looks up the customer to get template-specific data (name, lastOrderAt, etc.)
 * - Builds the appropriate React Email template via templateFactory pattern
 * - Calls sendMarketingEmail with idempotency key = `${automationId}-${customerId}-${eventTimestamp}`
 * - All send failures are non-fatal (sendMarketingEmail never throws)
 * - When actionConfig is provided, custom subject/headline/body/ctaText/discountCode override defaults
 */
export async function executeEmailAction(params: EmailActionParams): Promise<void> {
  const { shopId, customerId, automationId, emailTemplateId, eventTimestamp, actionConfig } = params

  // Extract overrides from actionConfig — when null/undefined, all defaults apply
  const config = actionConfig as ActionConfigOverrides | null

  const subject = config?.subject ?? (SUBJECT_MAP[emailTemplateId] ?? 'A message from our store')
  const idempotencyKey = `${automationId}-${customerId}-${eventTimestamp}`
  const storeName = env.RESEND_FROM_NAME ?? 'EcomCRM'

  // Look up customer for template-specific data
  const customer = await getCustomerByInternalId(shopId, customerId)
  const customerName = customer?.name ?? undefined

  // Build the templateFactory function based on emailTemplateId
  let templateFactory: (unsubscribeUrl: string) => React.ReactElement

  switch (emailTemplateId) {
    case 'welcome': {
      templateFactory = (unsubscribeUrl) =>
        React.createElement(WelcomeEmail, {
          storeName,
          customerName,
          unsubscribeUrl,
          customHeadline: config?.headline,
          customBody: config?.body,
          customCtaText: config?.ctaText,
        })
      break
    }

    case 'abandoned-cart': {
      templateFactory = (unsubscribeUrl) =>
        React.createElement(AbandonedCartEmail, {
          storeName,
          customerName,
          cartItems: [], // live cart items not available at delay time — use empty list
          cartUrl: env.SHOPIFY_STORE_URL,
          unsubscribeUrl,
          customHeadline: config?.headline,
          customBody: config?.body,
          customCtaText: config?.ctaText,
        })
      break
    }

    case 'repurchase': {
      const lastOrderDate = customer?.lastOrderAt
        ? customer.lastOrderAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : ''
      templateFactory = (unsubscribeUrl) =>
        React.createElement(RepurchaseEmail, {
          storeName,
          customerName,
          lastOrderDate,
          shopUrl: env.SHOPIFY_STORE_URL,
          unsubscribeUrl,
          customHeadline: config?.headline,
          customBody: config?.body,
          customCtaText: config?.ctaText,
        })
      break
    }

    case 'winback': {
      const daysSinceLastOrder = customer?.lastOrderAt
        ? Math.floor(
            (Date.now() - customer.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0
      // discountCode maps to the winback incentive prop (shown in the highlighted offer box)
      const incentive = config?.discountCode
        ? `Use code ${config.discountCode}`
        : undefined
      templateFactory = (unsubscribeUrl) =>
        React.createElement(WinbackEmail, {
          storeName,
          customerName,
          daysSinceLastOrder,
          shopUrl: env.SHOPIFY_STORE_URL,
          unsubscribeUrl,
          incentive,
          customHeadline: config?.headline,
          customBody: config?.body,
          customCtaText: config?.ctaText,
        })
      break
    }

    case 'vip': {
      const totalSpentFormatted = customer?.totalSpent
        ? `$${new Decimal(customer.totalSpent).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
        : '$0.00'
      const orderCount = customer?.orderCount ?? 0
      templateFactory = (unsubscribeUrl) =>
        React.createElement(VipEmail, {
          storeName,
          customerName,
          totalSpent: totalSpentFormatted,
          orderCount,
          shopUrl: env.SHOPIFY_STORE_URL,
          unsubscribeUrl,
          customHeadline: config?.headline,
          customBody: config?.body,
          customCtaText: config?.ctaText,
        })
      break
    }

    default: {
      templateFactory = (unsubscribeUrl) =>
        React.createElement(WelcomeEmail, {
          storeName,
          customerName,
          unsubscribeUrl,
          customHeadline: config?.headline,
          customBody: config?.body,
          customCtaText: config?.ctaText,
        })
      break
    }
  }

  // [pipeline] sendMarketingEmail: shopId=${shopId} customerId=${customerId} template=${emailTemplateId} idempotencyKey=${idempotencyKey}
  console.log(`[pipeline] executeEmailAction: calling sendMarketingEmail for customer=${customerId} template=${emailTemplateId}`)
  await sendMarketingEmail({
    shopId,
    customerInternalId: customerId,
    subject,
    templateFactory,
    idempotencyKey,
    automationId,
  })
}

// ─── Tag action executor ──────────────────────────────────────────────────────

/**
 * Execute a Shopify tag add or remove action.
 *
 * Best-effort: catches and logs errors, never throws.
 * Matches Phase 4 pattern from unsubscribe route.
 */
export async function executeTagAction(
  shopId: string,
  shopifyCustomerId: string,
  tag: string,
  action: 'add' | 'remove'
): Promise<void> {
  try {
    if (action === 'add') {
      await shopifyGraphQL<{ tagsAdd: { userErrors: Array<{ message: string }> } }>(
        `mutation tagsAdd($id: ID!, $tags: [String!]!) {
          tagsAdd(id: $id, tags: $tags) {
            userErrors { field message }
          }
        }`,
        { id: shopifyCustomerId, tags: [tag] }
      )
    } else {
      await shopifyGraphQL<{ tagsRemove: { userErrors: Array<{ message: string }> } }>(
        `mutation tagsRemove($id: ID!, $tags: [String!]!) {
          tagsRemove(id: $id, tags: $tags) {
            userErrors { field message }
          }
        }`,
        { id: shopifyCustomerId, tags: [tag] }
      )
    }
  } catch (err) {
    // Best-effort: Shopify tag sync failure must not block automation engine
    console.error(
      `[automation] executeTagAction failed — shopId=${shopId} shopifyCustomerId=${shopifyCustomerId} tag=${tag} action=${action}:`,
      err
    )
  }

  // Suppress unused shopId warning — present for future multi-tenant use
  void shopId
}
