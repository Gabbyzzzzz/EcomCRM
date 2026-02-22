'use client'

import dynamic from 'next/dynamic'
import { useRef, useCallback, useState } from 'react'
import type { EditorRef } from 'react-email-editor'

// MUST be at module level, not inside component
const EmailEditor = dynamic(() => import('react-email-editor'), { ssr: false })

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutomationInlineEditorProps {
  automationId: string
  /** Design JSON to load on mount — copied from linked template or existing custom design */
  initialDesign: object | null
  /** Called with html + designJson when user saves — async, may throw */
  onSave: (html: string, designJson: object) => Promise<void>
  /** Called when user closes/cancels the editor */
  onClose: () => void
}

// ─── AutomationInlineEditor ───────────────────────────────────────────────────

/**
 * Inline Unlayer editor for flow-specific template customization on the
 * automation detail page.
 *
 * Differences from UnlayerEditor.tsx (the full-screen email library editor):
 * - Renders inline (not fixed overlay) at 500px height
 * - Exposes onSave / onClose callbacks instead of routing + internal fetch
 * - Registers merge tags for dynamic variable injection
 * - Same pinned Unlayer version (1.157.0), same image upload pattern
 *
 * Merge tags registered (displayed in Unlayer's merge tag menu):
 *   {{customer_name}}, {{store_name}}, {{discount_code}}, {{unsubscribe_url}}, {{shop_url}}
 */
export function AutomationInlineEditor({
  initialDesign,
  onSave,
  onClose,
}: AutomationInlineEditorProps) {
  const editorRef = useRef<EditorRef>(null)
  // Store the unlayer instance directly from onReady — editorRef.current.editor
  // is unreliable with dynamic imports in Next.js
  const unlayerRef = useRef<EditorRef['editor'] | null>(null)
  const designLoadedRef = useRef<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [editorReady, setEditorReady] = useState<boolean>(false)

  const onReady = useCallback(
    (unlayer: EditorRef['editor']) => {
      if (!unlayer) return
      unlayerRef.current = unlayer
      setEditorReady(true)

      // Load saved design on first mount only (prevent React StrictMode double-fire)
      if (initialDesign !== null && !designLoadedRef.current) {
        unlayer.loadDesign(initialDesign as Parameters<typeof unlayer.loadDesign>[0])
        designLoadedRef.current = true
      }

      // Register merge tags for dynamic variable injection
      // These appear in the Unlayer "Merge Tags" menu for easy insertion
      unlayer.setMergeTags({
        customer_name: { name: 'Customer Name', value: '{{customer_name}}' },
        store_name: { name: 'Store Name', value: '{{store_name}}' },
        discount_code: { name: 'Discount Code', value: '{{discount_code}}' },
        unsubscribe_url: { name: 'Unsubscribe URL', value: '{{unsubscribe_url}}' },
        shop_url: { name: 'Shop URL', value: '{{shop_url}}' },
      })

      // Register image upload callback (same pattern as UnlayerEditor.tsx)
      unlayer.registerCallback(
        'image',
        async (
          file: { attachments: File[] },
          done: (result: { progress: number; url?: string }) => void
        ) => {
          done({ progress: 0 })
          const formData = new FormData()
          formData.append('file', file.attachments[0])
          const res = await fetch('/api/uploads/image', { method: 'POST', body: formData })
          if (!res.ok) {
            done({ progress: 0 })
            return
          }
          const { url } = (await res.json()) as { url: string }
          done({ progress: 100, url })
        }
      )
    },
    [initialDesign]
  )

  const handleSave = useCallback(async () => {
    if (!unlayerRef.current) return
    setSaving(true)
    try {
      const data = await new Promise<{ html: string; design: object }>((resolve) => {
        unlayerRef.current!.exportHtml((d: { html: string; design: object }) =>
          resolve({ html: d.html, design: d.design })
        )
      })
      await onSave(data.html, data.design)
    } catch {
      // onSave is responsible for showing error toasts
    } finally {
      setSaving(false)
    }
  }, [onSave])

  return (
    <div className="mt-4 rounded-lg border-2 border-primary/20 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
        <span className="text-sm font-medium text-foreground">
          Editing for this flow
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm rounded-md border border-input bg-background hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !editorReady}
            className="px-4 py-1 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Inline Unlayer editor — 500px height */}
      <EmailEditor
        ref={editorRef}
        onReady={onReady}
        minHeight="500px"
        options={{
          version: '1.157.0',
          appearance: { theme: 'modern_light' },
        }}
      />
    </div>
  )
}
