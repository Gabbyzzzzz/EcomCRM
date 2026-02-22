'use client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AutomationFormValues {
  delayValue: number | null
  delayUnit: string | null
  triggerConfig: Record<string, unknown> | null
  actionConfig: Record<string, unknown> | null
}

interface AutomationConfigFormProps {
  automationId: string
  triggerType: string
  values: AutomationFormValues
  onFieldChange: (field: keyof AutomationFormValues, value: unknown) => void
  onSave: () => Promise<void>
  onCancel: () => void
  isDirty: boolean
  isSaving: boolean
}

// ─── Input class names (consistent with SendTestEmailButton) ──────────────────

const inputClassName =
  'flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'

const labelClassName = 'block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1'

// ─── AutomationConfigForm ─────────────────────────────────────────────────────

/**
 * Controlled form component for editing automation configuration.
 *
 * This component owns NO state. All values come from props; all changes are
 * emitted via onFieldChange. This design allows Plan 09-02 to share state
 * between this form and a live email preview panel via a common parent wrapper.
 */
export function AutomationConfigForm({
  triggerType,
  values,
  onFieldChange,
  onSave,
  onCancel,
  isDirty,
  isSaving,
}: AutomationConfigFormProps) {
  const showDelay =
    triggerType === 'first_order' || triggerType === 'cart_abandoned'
  const showTriggerThreshold = triggerType === 'days_since_order'

  const triggerDays =
    typeof (values.triggerConfig as { days?: unknown } | null)?.days === 'number'
      ? ((values.triggerConfig as { days: number }).days as number)
      : undefined

  const discountCode =
    typeof (values.actionConfig as { discountCode?: unknown } | null)
      ?.discountCode === 'string'
      ? ((values.actionConfig as { discountCode: string }).discountCode as string)
      : ''

  const emailSubject =
    typeof (values.actionConfig as { subject?: unknown } | null)?.subject ===
    'string'
      ? ((values.actionConfig as { subject: string }).subject as string)
      : ''

  const emailBody =
    typeof (values.actionConfig as { body?: unknown } | null)?.body === 'string'
      ? ((values.actionConfig as { body: string }).body as string)
      : ''

  return (
    <div className="space-y-4">
      {/* Delay Value + Unit (event-driven triggers only) */}
      {showDelay && (
        <div>
          <label className={labelClassName}>Delay</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              value={values.delayValue ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                onFieldChange('delayValue', raw === '' ? null : Number(raw))
              }}
              placeholder="0"
              className={inputClassName}
            />
            <select
              value={values.delayUnit ?? 'hours'}
              onChange={(e) => onFieldChange('delayUnit', e.target.value)}
              className={`rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50`}
            >
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
          </div>
        </div>
      )}

      {/* Trigger Threshold — days_since_order only */}
      {showTriggerThreshold && (
        <div>
          <label className={labelClassName}>Trigger threshold (days since last order)</label>
          <input
            type="number"
            min={1}
            value={triggerDays ?? ''}
            onChange={(e) => {
              const raw = e.target.value
              const days = raw === '' ? undefined : Number(raw)
              onFieldChange('triggerConfig', {
                ...(values.triggerConfig ?? {}),
                days,
              })
            }}
            placeholder="30"
            className={inputClassName}
          />
        </div>
      )}

      {/* Discount Code — always shown */}
      <div>
        <label className={labelClassName}>Discount code</label>
        <input
          type="text"
          value={discountCode}
          onChange={(e) => {
            onFieldChange('actionConfig', {
              ...(values.actionConfig ?? {}),
              discountCode: e.target.value,
            })
          }}
          placeholder="SAVE10 (leave blank for none)"
          className={inputClassName}
        />
      </div>

      {/* Email Subject — always shown */}
      <div>
        <label className={labelClassName}>Email subject</label>
        <input
          type="text"
          value={emailSubject}
          onChange={(e) => {
            onFieldChange('actionConfig', {
              ...(values.actionConfig ?? {}),
              subject: e.target.value,
            })
          }}
          placeholder="Custom subject (leave blank to use template default)"
          className={inputClassName}
        />
      </div>

      {/* Email Body Text — always shown */}
      <div>
        <label className={labelClassName}>Email body text</label>
        <textarea
          rows={3}
          value={emailBody}
          onChange={(e) => {
            onFieldChange('actionConfig', {
              ...(values.actionConfig ?? {}),
              body: e.target.value,
            })
          }}
          placeholder="Custom body text (leave blank to use template default)"
          className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-y`}
        />
      </div>

      {/* Save / Cancel buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => void onSave()}
          disabled={!isDirty || isSaving}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={!isDirty}
          className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
