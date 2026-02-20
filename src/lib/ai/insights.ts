import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { anthropic } from '@ai-sdk/anthropic'
import { env } from '@/lib/env'

// ─── Provider factory ─────────────────────────────────────────────────────────

function getModel() {
  if (env.AI_PROVIDER === 'anthropic') {
    return anthropic('claude-sonnet-4-20250514')
  }
  return google('gemini-1.5-flash')
}

// ─── Customer insight ─────────────────────────────────────────────────────────

export interface CustomerInsightData {
  name: string | null
  email: string
  segment: string | null
  rfmR: number | null
  rfmF: number | null
  rfmM: number | null
  totalSpent: string
  orderCount: number
  avgOrderValue: string
  firstOrderAt: string | null
  lastOrderAt: string | null
  daysSinceLastOrder: number | null
}

/**
 * Generate a plain-language insight narrative for a single customer.
 * Returns a fallback string on error so callers never have to handle exceptions.
 */
export async function generateCustomerInsight(data: CustomerInsightData): Promise<string> {
  try {
    const systemPrompt =
      'You are a CRM analyst for a Shopify merchant. ' +
      'Produce a concise 2-4 sentence insight narrative about a customer. ' +
      'State their current segment and what it means, describe their purchasing pattern ' +
      '(frequency, recency, monetary value), and recommend one specific action the merchant ' +
      'should take (e.g., "send win-back offer", "upsell to premium tier", ' +
      '"maintain VIP engagement"). Use plain language a non-technical merchant would understand.'

    const parts: string[] = [
      `Customer name: ${data.name ?? 'Unknown'}`,
      `Email: ${data.email}`,
      `Segment: ${data.segment ?? 'Not segmented'}`,
      `RFM Scores — Recency: ${data.rfmR ?? 'N/A'}/5, Frequency: ${data.rfmF ?? 'N/A'}/5, Monetary: ${data.rfmM ?? 'N/A'}/5`,
      `Total spent: $${data.totalSpent}`,
      `Order count: ${data.orderCount}`,
      `Average order value: $${data.avgOrderValue}`,
      `First order date: ${data.firstOrderAt ?? 'No orders yet'}`,
      `Last order date: ${data.lastOrderAt ?? 'No orders yet'}`,
      `Days since last order: ${data.daysSinceLastOrder ?? 'N/A'}`,
    ]
    const userMessage = parts.join('\n')

    const { text } = await generateText({
      model: getModel(),
      system: systemPrompt,
      prompt: userMessage,
      maxOutputTokens: 300,
    })

    return text
  } catch (error) {
    console.error('[AI insights] generateCustomerInsight failed:', error)
    return 'Unable to generate insight at this time.'
  }
}

// ─── Email copy generation ────────────────────────────────────────────────────

export interface EmailCopyParams {
  templateType: string
  segmentTarget: string
  storeName: string
  automationName: string
}

export interface EmailCopySuggestions {
  suggestions: Array<{ subjectLine: string; bodyPreview: string }>
}

/**
 * Generate 3 email subject line + body preview combinations for the given template and segment.
 * Returns { suggestions: [] } on error so callers never have to handle exceptions.
 */
export async function generateEmailCopy(params: EmailCopyParams): Promise<EmailCopySuggestions> {
  try {
    const systemPrompt =
      'You are an expert email marketer for a Shopify merchant. ' +
      'Generate 3 email subject line and body preview combinations for the given email template ' +
      'and customer segment. ' +
      'Return ONLY valid JSON matching this exact shape with no markdown, no explanation, just JSON: ' +
      '{"suggestions":[{"subjectLine":"...","bodyPreview":"..."},{"subjectLine":"...","bodyPreview":"..."},{"subjectLine":"...","bodyPreview":"..."}]}'

    const userMessage = [
      `Store name: ${params.storeName}`,
      `Automation name: ${params.automationName}`,
      `Email template type: ${params.templateType}`,
      `Target customer segment: ${params.segmentTarget}`,
    ].join('\n')

    const { text } = await generateText({
      model: getModel(),
      system: systemPrompt,
      prompt: userMessage,
      maxOutputTokens: 600,
    })

    return JSON.parse(text) as EmailCopySuggestions
  } catch (error) {
    console.error('[AI insights] generateEmailCopy failed:', error)
    return { suggestions: [] }
  }
}
