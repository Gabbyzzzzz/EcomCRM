'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TemplateCardActionsProps {
  templateId: string
  templateName: string
}

export default function TemplateCardActions({
  templateId,
  templateName,
}: TemplateCardActionsProps) {
  const router = useRouter()
  const [duplicating, setDuplicating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDuplicate() {
    if (duplicating) return
    setDuplicating(true)

    try {
      const response = await fetch(
        `/api/email-templates/${templateId}?action=duplicate`,
        { method: 'POST' }
      )

      if (!response.ok) {
        console.error('Failed to duplicate template', await response.text())
        return
      }

      router.refresh()
    } catch (err) {
      console.error('Error duplicating template', err)
    } finally {
      setDuplicating(false)
    }
  }

  async function handleDelete() {
    if (deleting) return

    const confirmed = window.confirm(
      `Delete "${templateName}"? This action cannot be undone.`
    )
    if (!confirmed) return

    setDeleting(true)

    try {
      const response = await fetch(`/api/email-templates/${templateId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        console.error('Failed to delete template', await response.text())
        return
      }

      router.refresh()
    } catch (err) {
      console.error('Error deleting template', err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-2 pt-2 border-t mt-1">
      <Link
        href={`/emails/${templateId}/edit`}
        className="text-xs font-medium text-primary hover:underline"
      >
        Edit
      </Link>
      <button
        onClick={handleDuplicate}
        disabled={duplicating}
        className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
      >
        {duplicating ? 'Duplicating...' : 'Duplicate'}
      </button>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="text-xs font-medium text-destructive hover:text-destructive/80 disabled:opacity-50 transition-colors ml-auto"
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  )
}
