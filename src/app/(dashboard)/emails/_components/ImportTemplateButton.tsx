'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Upload, X } from 'lucide-react'

export default function ImportTemplateButton() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text === 'string') {
        setHtml(text)
        if (!name) setName(file.name.replace(/\.html?$/i, ''))
      }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    setError(null)
    if (!name.trim()) { setError('Template name is required'); return }
    if (!html.trim()) { setError('HTML content is required'); return }

    setLoading(true)
    try {
      // 1. Create the template record
      const createRes = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!createRes.ok) {
        setError('Failed to create template')
        return
      }
      const { id } = (await createRes.json()) as { id: string }

      // 2. Save the imported HTML via PUT
      const putRes = await fetch(`/api/email-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: html.trim() }),
      })
      if (!putRes.ok) {
        setError('Failed to save HTML')
        return
      }

      router.push(`/emails/${id}/edit`)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Upload className="h-4 w-4" />
        Import HTML
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-lg border shadow-lg w-full max-w-lg flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Import HTML Template</h2>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Template name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Template Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Holiday Campaign"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* File upload */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Upload .html File</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm"
            onChange={handleFileChange}
            className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1 file:text-sm file:cursor-pointer"
          />
        </div>

        {/* Paste HTML */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Or Paste HTML</label>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="<!DOCTYPE html><html>…</html>"
            rows={8}
            className="rounded-md border border-input bg-background px-3 py-2 text-xs font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button onClick={handleImport} disabled={loading} className="gap-2">
            <Upload className="h-4 w-4" />
            {loading ? 'Importing…' : 'Import Template'}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
