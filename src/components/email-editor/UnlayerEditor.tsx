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
  const designLoadedRef = useRef<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [editorReady, setEditorReady] = useState<boolean>(false)

  const onReady = useCallback(
    (unlayer: EditorRef['editor']) => {
      if (!unlayer) return
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
          const { url } = await res.json() as { url: string }
          done({ progress: 100, url })
        }
      )
    },
    [initialDesign]
  )

  const handleSave = useCallback(async () => {
    if (!editorRef.current?.editor) return
    setSaving(true)
    try {
      const data = await new Promise<{ html: string; design: object }>((resolve) => {
        editorRef.current!.editor!.exportHtml((d: { html: string; design: object }) =>
          resolve({ html: d.html, design: d.design })
        )
      })
      await fetch(`/api/email-templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: data.html, designJson: data.design }),
      })
    } finally {
      setSaving(false)
    }
  }, [templateId])

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/emails')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back
          </button>
          <h1 className="text-sm font-medium">{templateName}</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !editorReady}
          className="px-4 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Template'}
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
