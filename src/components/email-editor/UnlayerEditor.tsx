'use client'

import dynamic from 'next/dynamic'
import { useRef, useCallback, useState } from 'react'
import type { EditorRef } from 'react-email-editor'
import { useRouter } from 'next/navigation'
import { Monitor, Tablet, Smartphone, X } from 'lucide-react'

// MUST be at module level, not inside component
const EmailEditor = dynamic(() => import('react-email-editor'), { ssr: false })

interface UnlayerEditorProps {
  templateId: string
  templateName: string
  initialDesign: object | null
  initialHtml: string | null
}

/** Wrap raw HTML in a minimal Unlayer design JSON (single custom-HTML block) */
function htmlToDesign(html: string): object {
  return {
    body: {
      rows: [
        {
          cells: [1],
          columns: [
            {
              contents: [
                {
                  type: 'html',
                  values: {
                    html,
                    containerPadding: '0px',
                  },
                },
              ],
            },
          ],
        },
      ],
      values: {
        contentWidth: '600px',
        backgroundColor: '#ffffff',
        fontFamily: { label: 'Arial', value: 'arial,helvetica,sans-serif' },
      },
    },
  }
}

export function UnlayerEditor({ templateId, templateName, initialDesign, initialHtml }: UnlayerEditorProps) {
  const router = useRouter()
  const editorRef = useRef<EditorRef>(null)
  // Store the unlayer instance directly from onReady — editorRef.current.editor
  // is unreliable with dynamic imports in Next.js
  const unlayerRef = useRef<EditorRef['editor'] | null>(null)
  const designLoadedRef = useRef<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [editorReady, setEditorReady] = useState<boolean>(false)
  const [name, setName] = useState(templateName)
  const [editingName, setEditingName] = useState(false)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile' | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const onReady = useCallback(
    (unlayer: EditorRef['editor']) => {
      if (!unlayer) return
      unlayerRef.current = unlayer
      setEditorReady(true)

      // Load saved design on first mount only (prevent React StrictMode double-fire)
      if (!designLoadedRef.current) {
        const design = initialDesign ?? (initialHtml ? htmlToDesign(initialHtml) : null)
        if (design) {
          unlayer.loadDesign(design as Parameters<typeof unlayer.loadDesign>[0])
          designLoadedRef.current = true
        }
      }

      // Register image upload callback
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
    [initialDesign, initialHtml]
  )

  const handleSave = useCallback(async () => {
    if (!unlayerRef.current) return
    setSaving(true)
    setSaveStatus('idle')
    try {
      const data = await new Promise<{ html: string; design: object }>((resolve) => {
        unlayerRef.current!.exportHtml((d: { html: string; design: object }) =>
          resolve({ html: d.html, design: d.design })
        )
      })
      const res = await fetch(`/api/email-templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: data.html, designJson: data.design }),
      })
      setSaveStatus(res.ok ? 'saved' : 'error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } finally {
      setSaving(false)
    }
  }, [templateId])

  const handleNameSave = useCallback(
    async (newName: string) => {
      const trimmed = newName.trim()
      if (!trimmed || trimmed === templateName) {
        setName(templateName)
        setEditingName(false)
        return
      }
      setName(trimmed)
      setEditingName(false)
      await fetch(`/api/email-templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
    },
    [templateId, templateName]
  )

  const handlePreview = useCallback(async (device: 'desktop' | 'tablet' | 'mobile') => {
    if (!unlayerRef.current) return
    if (previewDevice === device) {
      setPreviewDevice(null)
      setPreviewHtml(null)
      return
    }
    setPreviewLoading(true)
    setPreviewDevice(device)
    const data = await new Promise<{ html: string }>((resolve) => {
      unlayerRef.current!.exportHtml((d: { html: string; design: object }) => resolve(d))
    })
    setPreviewHtml(data.html)
    setPreviewLoading(false)
  }, [previewDevice])

  const DEVICE_WIDTHS = { desktop: 600, tablet: 480, mobile: 375 } as const

  const saveLabel =
    saving ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? 'Error' : 'Save Template'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/emails')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back
          </button>
          {editingName ? (
            <input
              autoFocus
              className="text-sm font-medium border rounded px-2 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              defaultValue={name}
              onBlur={(e) => handleNameSave(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') { setEditingName(false); setName(name) }
              }}
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-sm font-medium hover:text-primary hover:underline decoration-dashed underline-offset-2"
              title="Click to rename"
            >
              {name}
            </button>
          )}
        </div>

        {/* Device preview toggles */}
        <div className="flex items-center gap-1 border rounded-md p-0.5 bg-muted/40">
          {([
            { device: 'desktop', Icon: Monitor, label: 'Desktop (600px)' },
            { device: 'tablet', Icon: Tablet, label: 'Tablet (480px)' },
            { device: 'mobile', Icon: Smartphone, label: 'Mobile (375px)' },
          ] as const).map(({ device, Icon, label }) => (
            <button
              key={device}
              onClick={() => handlePreview(device)}
              disabled={!editorReady}
              title={label}
              className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
                previewDevice === device
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !editorReady}
          className={`px-4 py-1.5 text-sm rounded-md transition-colors disabled:opacity-50 ${
            saveStatus === 'saved'
              ? 'bg-green-600 text-white'
              : saveStatus === 'error'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {saveLabel}
        </button>
      </div>

      {/* Editor + preview pane */}
      <div className="flex flex-1 overflow-hidden">
        <div className={`${previewDevice ? 'w-1/2' : 'flex-1'} flex flex-col overflow-hidden`}>
          <EmailEditor
            ref={editorRef}
            onReady={onReady}
            style={{ flex: 1 }}
            options={{
              version: '1.157.0',
              appearance: { theme: 'modern_light' },
            }}
          />
        </div>

        {/* Preview pane */}
        {previewDevice && (
          <div className="w-1/2 border-l bg-muted/30 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
              <span className="text-sm font-medium text-muted-foreground">
                Preview — {previewDevice === 'desktop' ? '600px' : previewDevice === 'tablet' ? '480px' : '375px'}
              </span>
              <button
                onClick={() => { setPreviewDevice(null); setPreviewHtml(null) }}
                className="text-muted-foreground hover:text-foreground"
                title="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-start justify-center p-4">
              {previewLoading ? (
                <div className="mt-8 text-sm text-muted-foreground animate-pulse">Generating preview…</div>
              ) : previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  title={`${previewDevice} preview`}
                  style={{
                    width: `${DEVICE_WIDTHS[previewDevice]}px`,
                    height: '100%',
                    minHeight: '600px',
                    border: 'none',
                    display: 'block',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                    borderRadius: '4px',
                    background: '#fff',
                  }}
                  sandbox="allow-same-origin"
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
