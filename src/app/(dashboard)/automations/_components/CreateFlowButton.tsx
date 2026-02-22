'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'

interface TemplateOption {
  id: string
  name: string
}

interface CreateFlowButtonProps {
  templateOptions: TemplateOption[]
}

const TRIGGER_OPTIONS = [
  { value: 'first_order', label: 'First order placed' },
  { value: 'days_since_order', label: 'Days since last order' },
  { value: 'segment_change', label: 'Segment changes to…' },
  { value: 'tag_added', label: 'Tag added' },
] as const

type TriggerType = (typeof TRIGGER_OPTIONS)[number]['value']

const SEGMENT_OPTIONS = [
  'champion', 'loyal', 'potential', 'new', 'at_risk', 'hibernating', 'lost',
] as const

export default function CreateFlowButton({ templateOptions }: CreateFlowButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState<TriggerType>('first_order')
  const [daysSince, setDaysSince] = useState('30')
  const [toSegment, setToSegment] = useState<string>('champion')
  const [tagValue, setTagValue] = useState('')
  const [delayValue, setDelayValue] = useState('')
  const [delayUnit, setDelayUnit] = useState<'hours' | 'days'>('days')
  const [templateId, setTemplateId] = useState<string>('')

  function buildTriggerConfig(): Record<string, unknown> | null {
    if (triggerType === 'days_since_order') return { days: Number(daysSince) }
    if (triggerType === 'segment_change') return { toSegment }
    if (triggerType === 'tag_added') return { tag: tagValue.trim() }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Name is required'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          triggerType,
          triggerConfig: buildTriggerConfig(),
          delayValue: delayValue ? Number(delayValue) : null,
          delayUnit: delayValue ? delayUnit : null,
          linkedEmailTemplateId: templateId || null,
        }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? 'Failed to create flow')
        return
      }

      const created = (await res.json()) as { id: string }
      router.push(`/automations/${created.id}`)
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Create New Flow
      </Button>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-medium">Create New Automation Flow</h2>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Flow Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Welcome Series"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Trigger */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Trigger Condition</label>
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value as TriggerType)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {TRIGGER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Trigger sub-config */}
        {triggerType === 'days_since_order' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Days Since Last Order</label>
            <input
              type="number"
              min="1"
              value={daysSince}
              onChange={(e) => setDaysSince(e.target.value)}
              className="w-32 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}

        {triggerType === 'segment_change' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Target Segment</label>
            <select
              value={toSegment}
              onChange={(e) => setToSegment(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {SEGMENT_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {triggerType === 'tag_added' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Tag Value</label>
            <input
              value={tagValue}
              onChange={(e) => setTagValue(e.target.value)}
              placeholder="e.g. vip or shopify:vip"
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Prefix with <code className="bg-muted px-1 rounded">shopify:</code> for Shopify tags, or no prefix for CRM tags.
            </p>
          </div>
        )}

        {/* Delay */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Send Delay <span className="text-muted-foreground font-normal">(optional)</span></label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={delayValue}
              onChange={(e) => setDelayValue(e.target.value)}
              placeholder="0"
              className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <select
              value={delayUnit}
              onChange={(e) => setDelayUnit(e.target.value as 'hours' | 'days')}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
          </div>
        </div>

        {/* Email template */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Email Template <span className="text-muted-foreground font-normal">(optional)</span></label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">None (set later)</option>
            {templateOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Flow'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
