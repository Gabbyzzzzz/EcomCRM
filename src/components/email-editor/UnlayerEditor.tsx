'use client'

import dynamic from 'next/dynamic'
import { useRef, useCallback, useState } from 'react'
import type { EditorRef } from 'react-email-editor'
import { useRouter } from 'next/navigation'

// MUST be at module level, not inside component
const EmailEditor = dynamic(() => import('react-email-editor'), { ssr: false })

interface UnlayerEditorProps {
  templateId: string
  templateName: string
  initialDesign: object | null
}

export function UnlayerEditor({ templateId, templateName, initialDesign }: UnlayerEditorProps) {
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
    [initialDesign]
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

  const saveLabel =
    saving ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? 'Error' : 'Save Template'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
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
      <EmailEditor
        ref={editorRef}
        onReady={onReady}
        minHeight="calc(100vh - 49px)"
        options={{
          version: '1.157.0',
          appearance: { theme: 'modern_light' },
        }}
      />
    </div>
  )
}
