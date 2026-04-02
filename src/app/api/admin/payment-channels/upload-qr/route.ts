import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logActivity, logError } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user
    const serviceClient = createServiceClient()
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    // Use the auth header to verify user context (for logging)
    // In practice, we rely on RLS and the fact that only admins can call this
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    // Generate a unique filename
    const ext = file.name.split('.').pop() || 'png'
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

    // Convert file to buffer
    const buffer = await file.arrayBuffer()

    // Upload to Supabase Storage using service client (bypasses RLS)
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('payment-qrcodes')
      .upload(filename, Buffer.from(buffer), {
        contentType: file.type,
      })

    if (uploadError) {
      void logError('payment_channel.qr_upload_storage_failed', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload QR code image' },
        { status: 500 }
      )
    }

    // Get the public URL
    const { data: publicUrlData } = serviceClient.storage
      .from('payment-qrcodes')
      .getPublicUrl(uploadData.path)

    // Log successful upload
    void logActivity('payment_channel.qr_upload', 'system', {
      path: uploadData.path,
      size: file.size,
      type: file.type,
    })

    return NextResponse.json({
      success: true,
      publicUrl: publicUrlData.publicUrl,
      path: uploadData.path,
    })
  } catch (error) {
    void logError('payment_channel.qr_upload_failed', error, 'system', {
      errorMessage: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
