import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// Allowed image MIME types
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
])

// Max file size: 5MB
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: Request): Promise<NextResponse> {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate MIME type
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: jpeg, png, gif, webp, svg' },
      { status: 400 }
    )
  }

  // Validate file size
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 5MB' },
      { status: 400 }
    )
  }

  // Derive extension from original filename
  const originalName = file.name ?? 'upload'
  const dotIndex = originalName.lastIndexOf('.')
  const ext = dotIndex !== -1 ? originalName.slice(dotIndex + 1) : 'bin'

  // Generate unique storage path
  const path = `email-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  // Create Supabase service-role client (server-side only)
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('email-assets')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[uploads/image] Supabase upload error:', uploadError)
    return NextResponse.json(
      { error: 'Upload failed. Ensure the email-assets bucket exists and is public.' },
      { status: 500 }
    )
  }

  // Get public URL
  const { data } = supabase.storage.from('email-assets').getPublicUrl(path)

  return NextResponse.json({ url: data.publicUrl })
}
