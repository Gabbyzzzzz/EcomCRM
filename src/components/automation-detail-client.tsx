'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AutomationConfigForm,
  type AutomationFormValues,
} from '@/components/automation-config-form'
import { EmailPreviewPanel } from '@/components/email-preview-panel'
import { SendTestEmailButton } from '@/components/send-test-email-button'
import { AutomationInlineEditor } from '@/components/automation-inline-editor'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutomationDetailClientProps {
  automationId: string
  triggerType: string
  emailTemplateId: string | null
  initialDelayValue: number | null
  initialDelayUnit: string | null
  initialTriggerConfig: Record<string, unknown> | null
  initialActionConfig: Record<string, unknown> | null
  /** Lightweight dropdown options from listEmailTemplatesForDropdown */
  templateOptions: Array<{ id: string; name: string }>
  /** UUID of the currently linked email template (Tier 2) */
  initialLinkedEmailTemplateId: string | null
  /** Flow-specific HTML override (Tier 1) — null if none set */
  initialCustomTemplateHtml: string | null
  /** Flow-specific Unlayer design JSON stored alongside customTemplateHtml — null if none set */
  initialCustomTemplateJson: object | null
}

// ─── Helpers to extract actionConfig fields ───────────────────────────────────

function getStringField(
  config: Record<string, unknown> | null,
  key: string
): string | undefined {
  const val = config?.[key]
  return typeof val === 'string' && val !== '' ? val : undefined
}

// ─── AutomationDetailClient ───────────────────────────────────────────────────

/**
 * Client wrapper that owns form state and coordinates between
 * AutomationConfigForm (controlled) and EmailPreviewPanel (live preview).
 *
 * Layout: config form on top, email preview panel below on mobile;
 * side-by-side (form left, preview right) on lg+ screens.
 *
 * Template selector dropdown (Phase 14):
 * - "Default (React Email)" = empty string → Tier 3 fallback
 * - Any template option → Tier 2, persisted as linkedEmailTemplateId UUID FK
 * - customTemplateHtml present → Tier 1 badge displayed
 */
export function AutomationDetailClient({
  automationId,
  triggerType,
  emailTemplateId,
  initialDelayValue,
  initialDelayUnit,
  initialTriggerConfig,
  initialActionConfig,
  templateOptions,
  initialLinkedEmailTemplateId,
  initialCustomTemplateHtml,
  initialCustomTemplateJson,
}: AutomationDetailClientProps) {
  const router = useRouter()

  // ─── Form state ───────────────────────────────────────────────────────────

  const [values, setValues] = useState<AutomationFormValues>({
    delayValue: initialDelayValue,
    delayUnit: initialDelayUnit,
    triggerConfig: initialTriggerConfig,
    actionConfig: initialActionConfig,
  })

  // Last saved snapshot — used for isDirty comparison and Cancel revert
  const lastSavedRef = useRef<AutomationFormValues>({
    delayValue: initialDelayValue,
    delayUnit: initialDelayUnit,
    triggerConfig: initialTriggerConfig,
    actionConfig: initialActionConfig,
  })

  const [isSaving, setIsSaving] = useState(false)

  // ─── Template linking state (Phase 14) ────────────────────────────────────

  const [linkedEmailTemplateId, setLinkedEmailTemplateId] = useState<string | null>(
    initialLinkedEmailTemplateId
  )
  const lastSavedLinkedTemplateRef = useRef<string | null>(initialLinkedEmailTemplateId)

  // customTemplateHtml tracks whether a Tier 1 override is active for badge display
  // The actual HTML is managed server-side — we reflect server state here
  const [customTemplateHtml, setCustomTemplateHtml] = useState<string | null>(initialCustomTemplateHtml)

  // ─── Inline editor state (Phase 14-02) ───────────────────────────────────

  const [isCustomizing, setIsCustomizing] = useState<boolean>(false)
  const [customDesignJson, setCustomDesignJson] = useState<object | null>(initialCustomTemplateJson)

  // ─── isDirty ──────────────────────────────────────────────────────────────

  const isFormDirty = JSON.stringify(values) !== JSON.stringify(lastSavedRef.current)
  const isTemplateDirty = linkedEmailTemplateId !== lastSavedLinkedTemplateRef.current
  const isDirty = isFormDirty || isTemplateDirty

  // ─── onFieldChange ────────────────────────────────────────────────────────

  const onFieldChange = useCallback(
    (field: keyof AutomationFormValues, value: unknown) => {
      setValues((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  // ─── onSave ───────────────────────────────────────────────────────────────

  const onSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/automations/${automationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delayValue: values.delayValue,
          delayUnit: values.delayUnit,
          triggerConfig: values.triggerConfig ?? {},
          actionConfig: values.actionConfig ?? {},
          // Phase 14: include linkedEmailTemplateId in save
          linkedEmailTemplateId: linkedEmailTemplateId ?? null,
        }),
      })

      const json = (await res.json()) as { ok?: boolean; error?: string }

      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Save failed')
        return
      }

      lastSavedRef.current = values
      lastSavedLinkedTemplateRef.current = linkedEmailTemplateId
      toast.success('Automation saved')
      router.refresh()
    } catch {
      toast.error('Network error — check the console')
    } finally {
      setIsSaving(false)
    }
  }, [automationId, values, linkedEmailTemplateId, router])

  // ─── onCancel ─────────────────────────────────────────────────────────────

  const onCancel = useCallback(() => {
    setValues(lastSavedRef.current)
    setLinkedEmailTemplateId(lastSavedLinkedTemplateRef.current)
  }, [])

  // ─── Customize for this Flow ──────────────────────────────────────────────

  const onCustomizeForFlow = useCallback(async () => {
    // a) Existing custom JSON — open editor with it
    if (customDesignJson) {
      setIsCustomizing(true)
      return
    }

    // b) No custom JSON but a linked template — fetch its designJson
    if (linkedEmailTemplateId) {
      try {
        const res = await fetch(`/api/email-templates/${linkedEmailTemplateId}`)
        if (!res.ok) {
          toast.error('Failed to load template design')
          return
        }
        const template = (await res.json()) as { designJson?: object | null }
        setCustomDesignJson(template.designJson ?? null)
        setIsCustomizing(true)
      } catch {
        toast.error('Network error loading template')
      }
      return
    }

    // c) Neither — prompt to select a template first
    toast.error('Select a template first')
  }, [customDesignJson, linkedEmailTemplateId])

  // ─── Inline editor save ───────────────────────────────────────────────────

  const onInlineEditorSave = useCallback(
    async (html: string, designJson: object) => {
      try {
        const res = await fetch(`/api/automations/${automationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customTemplateHtml: html,
            customTemplateJson: designJson,
          }),
        })

        const json = (await res.json()) as { ok?: boolean; error?: string }

        if (!res.ok || !json.ok) {
          toast.error(json.error ?? 'Failed to save custom template')
          return
        }

        // Update local state to reflect new Tier 1 override
        setCustomTemplateHtml(html)
        setCustomDesignJson(designJson)
        setIsCustomizing(false)
        toast.success('Custom template saved')
        router.refresh()
      } catch {
        toast.error('Network error — check the console')
      }
    },
    [automationId, router]
  )

  // ─── Clear Customization ──────────────────────────────────────────────────

  const onClearCustomization = useCallback(async () => {
    const confirmed = window.confirm(
      'Remove flow-specific edits? This will revert to the linked template.'
    )
    if (!confirmed) return

    try {
      const res = await fetch(`/api/automations/${automationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customTemplateHtml: null,
          customTemplateJson: null,
        }),
      })

      const json = (await res.json()) as { ok?: boolean; error?: string }

      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Failed to clear customization')
        return
      }

      setCustomTemplateHtml(null)
      setCustomDesignJson(null)
      setIsCustomizing(false)
      toast.success('Customization cleared — reverting to linked template')
      router.refresh()
    } catch {
      toast.error('Network error — check the console')
    }
  }, [automationId, router])

  // ─── Derived preview props from current actionConfig ─────────────────────

  const previewSubject = getStringField(
    values.actionConfig as Record<string, unknown> | null,
    'subject'
  )
  const previewHeadline = getStringField(
    values.actionConfig as Record<string, unknown> | null,
    'headline'
  )
  const previewBody = getStringField(
    values.actionConfig as Record<string, unknown> | null,
    'body'
  )
  const previewCtaText = getStringField(
    values.actionConfig as Record<string, unknown> | null,
    'ctaText'
  )
  const previewDiscountCode = getStringField(
    values.actionConfig as Record<string, unknown> | null,
    'discountCode'
  )

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Template selector (Phase 14) */}
      {templateOptions.length > 0 && (
        <div className="mb-6 rounded-md border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label
              htmlFor="template-select"
              className="text-sm font-medium text-muted-foreground whitespace-nowrap"
            >
              Email Template:
            </label>
            <select
              id="template-select"
              value={linkedEmailTemplateId ?? ''}
              onChange={(e) => setLinkedEmailTemplateId(e.target.value || null)}
              className="flex-1 min-w-[200px] rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Default (React Email)</option>
              {templateOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {customTemplateHtml && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                Custom edits applied
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Select a template from your email library. &quot;Default&quot; uses the built-in React Email template.
          </p>

          {/* Customize for this Flow / Clear Customization buttons (Phase 14-02) */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              type="button"
              onClick={onCustomizeForFlow}
              className="px-3 py-1.5 text-sm rounded-md border border-primary text-primary hover:bg-primary/5 transition-colors"
            >
              Customize for this Flow
            </button>
            {customTemplateHtml && (
              <button
                type="button"
                onClick={onClearCustomization}
                className="px-3 py-1.5 text-sm rounded-md border border-destructive text-destructive hover:bg-destructive/5 transition-colors"
              >
                Clear Customization
              </button>
            )}
          </div>

          {/* Inline Unlayer editor — visible when isCustomizing is true */}
          {isCustomizing && (
            <AutomationInlineEditor
              automationId={automationId}
              initialDesign={customDesignJson}
              onSave={onInlineEditorSave}
              onClose={() => setIsCustomizing(false)}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration form */}
        <AutomationConfigForm
          automationId={automationId}
          triggerType={triggerType}
          values={values}
          onFieldChange={onFieldChange}
          onSave={onSave}
          onCancel={onCancel}
          isDirty={isDirty}
          isSaving={isSaving}
        />

        {/* Live email preview */}
        <EmailPreviewPanel
          automationId={automationId}
          emailTemplateId={emailTemplateId}
          subject={previewSubject}
          headline={previewHeadline}
          body={previewBody}
          ctaText={previewCtaText}
          discountCode={previewDiscountCode}
          linkedEmailTemplateId={linkedEmailTemplateId}
          customTemplateHtml={customTemplateHtml}
        />
      </div>

      {/* Send Test Email */}
      <div className="mt-6">
        <h3 className="text-base font-medium mb-1">Send Test Email</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Send a test version with your current edits — no need to save first
        </p>
        <SendTestEmailButton
          automationId={automationId}
          subject={previewSubject}
          headline={previewHeadline}
          bodyText={previewBody}
          ctaText={previewCtaText}
          discountCode={previewDiscountCode}
        />
      </div>
    </>
  )
}
