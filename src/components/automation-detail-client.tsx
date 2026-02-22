'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AutomationConfigForm,
  type AutomationFormValues,
} from '@/components/automation-config-form'
import { EmailPreviewPanel } from '@/components/email-preview-panel'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutomationDetailClientProps {
  automationId: string
  triggerType: string
  emailTemplateId: string | null
  initialDelayValue: number | null
  initialDelayUnit: string | null
  initialTriggerConfig: Record<string, unknown> | null
  initialActionConfig: Record<string, unknown> | null
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
 */
export function AutomationDetailClient({
  automationId,
  triggerType,
  emailTemplateId,
  initialDelayValue,
  initialDelayUnit,
  initialTriggerConfig,
  initialActionConfig,
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

  // ─── isDirty ──────────────────────────────────────────────────────────────

  const isDirty = JSON.stringify(values) !== JSON.stringify(lastSavedRef.current)

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
        }),
      })

      const json = (await res.json()) as { ok?: boolean; error?: string }

      if (!res.ok || !json.ok) {
        toast.error(json.error ?? 'Save failed')
        return
      }

      lastSavedRef.current = values
      toast.success('Automation saved')
      router.refresh()
    } catch {
      toast.error('Network error — check the console')
    } finally {
      setIsSaving(false)
    }
  }, [automationId, values, router])

  // ─── onCancel ─────────────────────────────────────────────────────────────

  const onCancel = useCallback(() => {
    setValues(lastSavedRef.current)
  }, [])

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
      />
    </div>
  )
}
