'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function CreateTemplateButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (loading) return
    setLoading(true)

    try {
      const response = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled Template' }),
      })

      if (!response.ok) {
        console.error('Failed to create template', await response.text())
        return
      }

      const template = (await response.json()) as { id: string }
      router.push(`/emails/${template.id}/edit`)
    } catch (err) {
      console.error('Error creating template', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleCreate} disabled={loading}>
      {loading ? 'Creating...' : 'Create New'}
    </Button>
  )
}
