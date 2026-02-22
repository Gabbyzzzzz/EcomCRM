import React from 'react'
import { env } from '@/lib/env'
import { sendMarketingEmail } from '@/lib/email/send'
import { shopifyGraphQL } from '@/lib/shopify/client'
import { getCustomerByInternalId, getEmailTemplate } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { automations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import Decimal from 'decimal.js'
import WelcomeEmail from '@/emails/welcome'
import AbandonedCartEmail from '@/emails/abandoned-cart'
import RepurchaseEmail from '@/emails/repurchase'
import WinbackEmail from '@/emails/winback'
import VipEmail from '@/emails/vip'
import { buildUnsubscribeUrl } from '@/lib/email/unsubscribe'

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

// ─── Variable substitution helper ─────────────────────────────────────────────

/**
 * Replace {{variable_name}} placeholders in raw HTML with actual values.
 * Used for Tier 1 (customTemplateHtml) and Tier 2 (linked email template HTML).
 *
 * Supported variables:
 *   {{customer_name}}    — customer's display name
 *   {{store_name}}       — RESEND_FROM_NAME env var
 *   {{unsubscribe_url}}  — one-click unsubscribe URL
 *   {{discount_code}}    — optional discount code from actionConfig
 *   {{shop_url}}         — SHOPIFY_STORE_URL
 */
export function substituteVariables(
  html: string,
  vars: Record<string, string>
): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return vars[key] ?? match
  })
}

// ─── Email action executor ────────────────────────────────────────────────────

/**
 * Execute an email action for an automation.
 *
 * Phase 14: 3-tier template fallback (highest to lowest priority):
 *   Tier 1 — customTemplateHtml on the automation row (flow-specific HTML override)
 *   Tier 2 — linkedEmailTemplateId → fetch HTML from email_templates table
 *   Tier 3 — React Email template switch (legacy behavior, always succeeds)
 *
 * For Tiers 1 and 2, variable substitution replaces {{customer_name}} etc. in the
 * HTML before sending via sendMarketingEmail with rawHtml option.
 *
 * Tier 3 uses the existing templateFactory pattern (unchanged).
 *
 * All send failures are non-fatal (sendMarketingEmail never throws).
 * When actionConfig is provided, custom subject/headline/body/ctaText/discountCode override defaults.
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

  // ── Phase 14: Fetch automation row for Tier 1/2 data ─────────────────────
  const shopId2 = shopId // capture for use in closure
  const [automationRow] = await db
    .select({
      customTemplateHtml: automations.customTemplateHtml,
      linkedEmailTemplateId: automations.linkedEmailTemplateId,
    })
    .from(automations)
    .where(and(eq(automations.id, automationId), eq(automations.shopId, shopId2)))
    .limit(1)

  // Build unsubscribe URL for variable substitution (needed for Tier 1 and 2)
  const unsubscribeUrl = buildUnsubscribeUrl(customerId, shopId)

  // Common substitution variables
  const substVars: Record<string, string> = {
    customer_name: customerName ?? 'Valued Customer',
    store_name: storeName,
    unsubscribe_url: unsubscribeUrl,
    discount_code: config?.discountCode ?? '',
    shop_url: env.SHOPIFY_STORE_URL ?? '',
  }

  // ── Tier 1: Flow-specific custom HTML ────────────────────────────────────
  if (automationRow?.customTemplateHtml) {
    const rawHtml = substituteVariables(automationRow.customTemplateHtml, substVars)
    console.log(`[pipeline] executeEmailAction: Tier 1 (customTemplateHtml) customer=${customerId}`)
    await sendMarketingEmail({
      shopId,
      customerInternalId: customerId,
      subject,
      templateFactory: () => React.createElement('div', { dangerouslySetInnerHTML: { __html: rawHtml } }),
      rawHtml,
      idempotencyKey,
      automationId,
    })
    return
  }

  // ── Tier 2: Linked email template from library ────────────────────────────
  if (automationRow?.linkedEmailTemplateId) {
    const linkedTemplate = await getEmailTemplate(shopId, automationRow.linkedEmailTemplateId)
    if (linkedTemplate?.html) {
      const rawHtml = substituteVariables(linkedTemplate.html, substVars)
      console.log(`[pipeline] executeEmailAction: Tier 2 (linkedTemplate=${automationRow.linkedEmailTemplateId}) customer=${customerId}`)
      await sendMarketingEmail({
        shopId,
        customerInternalId: customerId,
        subject,
        templateFactory: () => React.createElement('div', { dangerouslySetInnerHTML: { __html: rawHtml } }),
        rawHtml,
        idempotencyKey,
        automationId,
      })
      return
    }
    // Linked template found but has no HTML — fall through to Tier 3
    console.warn(`[pipeline] executeEmailAction: Tier 2 linked template ${automationRow.linkedEmailTemplateId} has no HTML, falling to Tier 3`)
  }

  // ── Tier 3: React Email template (original behavior, always succeeds) ────
  let templateFactory: (unsubscribeUrl: string) => React.ReactElement

  switch (emailTemplateId) {
    case 'welcome': {
      templateFactory = (unsub) =>
        React.createElement(WelcomeEmail, {
          storeName,
          customerName,
          unsubscribeUrl: unsub,
          customHeadline: config?.headline,
          customBody: config?.body,
          customCtaText: config?.ctaText,
        })
      break
    }

    case 'abandoned-cart': {
      templateFactory = (unsub) =>
        React.createElement(AbandonedCartEmail, {
          storeName,
          customerName,
          cartItems: [], // live cart items not available at delay time — use empty list
          cartUrl: env.SHOPIFY_STORE_URL,
          unsubscribeUrl: unsub,
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
      templateFactory = (unsub) =>
        React.createElement(RepurchaseEmail, {
          storeName,
          customerName,
          lastOrderDate,
          shopUrl: env.SHOPIFY_STORE_URL,
          unsubscribeUrl: unsub,
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
      templateFactory = (unsub) =>
        React.createElement(WinbackEmail, {
          storeName,
          customerName,
          daysSinceLastOrder,
          shopUrl: env.SHOPIFY_STORE_URL,
          unsubscribeUrl: unsub,
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
      templateFactory = (unsub) =>
        React.createElement(VipEmail, {
          storeName,
          customerName,
          totalSpent: totalSpentFormatted,
          orderCount,
          shopUrl: env.SHOPIFY_STORE_URL,
          unsubscribeUrl: unsub,
          customHeadline: config?.headline,
          customBody: config?.body,
          customCtaText: config?.ctaText,
        })
      break
    }

    default: {
      templateFactory = (unsub) =>
        React.createElement(WelcomeEmail, {
          storeName,
          customerName,
          unsubscribeUrl: unsub,
          customHeadline: config?.headline,
          customBody: config?.body,
          customCtaText: config?.ctaText,
        })
      break
    }
  }

  console.log(`[pipeline] executeEmailAction: Tier 3 (React Email) customer=${customerId} template=${emailTemplateId}`)
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
