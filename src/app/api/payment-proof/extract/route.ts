import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logActivity, logError } from '@/lib/logger'
import { getExtractionSetting } from '@/lib/config/extraction-settings'
import { updatePaymentExtraction } from '@/lib/queries/payments'

interface ExtractedData {
  amount: number | null
  reference_number: string | null
  payment_datetime: string | null
  sender_name: string | null
  confidence: 'high' | 'medium' | 'low' | 'failed'
}

export async function POST(req: NextRequest) {
  let paymentId: string | undefined  // hoisted so catch can set extraction_status: 'failed'

  try {
    const body = await req.json()
    const { user_payment_id, payment_proof_url } = body

    // Check global extraction setting before doing any work
    const { enabled } = getExtractionSetting()
    if (!enabled) {
      return NextResponse.json({ skipped: true, reason: 'extraction_disabled' }, { status: 200 })
    }

    if (!payment_proof_url || !user_payment_id) {
      return NextResponse.json(
        { error: 'Missing user_payment_id or payment_proof_url' },
        { status: 400 }
      )
    }

    paymentId = user_payment_id

    // Verify the registration exists and belongs to the user (optional, for security)
    const serverClient = await createClient()
    const { data: { user: authUser } } = await serverClient.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Download the image from Supabase Storage using service client
    const serviceClient = createServiceClient()
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('payment-proofs')
      .download(payment_proof_url)

    if (downloadError || !fileData) {
      void logError('payment_proof.extract.download_failed', downloadError)
      // Don't fail the user - just mark as failed extraction
      const extractedData: ExtractedData = {
        amount: null,
        reference_number: null,
        payment_datetime: null,
        sender_name: null,
        confidence: 'failed',
      }

      await updatePaymentExtraction(serviceClient, paymentId!, {
        extracted_amount: null,
        extracted_reference: null,
        extracted_datetime: null,
        extracted_sender: null,
        extraction_confidence: 'failed',
        extracted_raw: { error: 'File download failed' },
        extraction_status: 'failed',
      })

      return NextResponse.json({
        success: true,
        extracted: extractedData,
        note: 'Extraction failed - image not accessible',
      })
    }

    // Convert to base64
    const buffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    // Determine media type from filename
    const filename = payment_proof_url.split('/').pop() || ''
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpeg'
    const mediaTypeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    }
    const mediaType = (mediaTypeMap[ext] || 'image/jpeg') as
      | 'image/jpeg'
      | 'image/png'
      | 'image/gif'
      | 'image/webp'

    // Check if we're in mock mode (for development/testing without token costs)
    if (process.env.MOCK_EXTRACTION === 'true') {
      const mockExtracted = {
        amount: 500.0,
        reference_number: 'MOCK-REF-' + Date.now(),
        payment_datetime: new Date().toISOString(),
        sender_name: 'Test User',
        confidence: 'high' as const,
      }

      const { error: mockUpdateError } = await updatePaymentExtraction(serviceClient, paymentId!, {
        extracted_amount: mockExtracted.amount,
        extracted_reference: mockExtracted.reference_number,
        extracted_datetime: mockExtracted.payment_datetime,
        extracted_sender: mockExtracted.sender_name,
        extraction_confidence: mockExtracted.confidence,
        extracted_raw: { source: 'MOCK_DATA', note: 'Development mode - not from Claude API' },
        extraction_status: 'done',
      })

      if (mockUpdateError) {
        void logError('payment_proof.extract_mock_update_failed', mockUpdateError, authUser.id, { payment_id: paymentId })
      } else {
        await logActivity('payment_proof.extract_mock', authUser.id, {
          payment_id: paymentId,
          amount: mockExtracted.amount,
          mode: 'mock',
        })
      }

      return NextResponse.json({
        success: true,
        extracted: mockExtracted,
        mode: 'MOCK (development)',
      })
    }

    // Call Claude API with vision
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: `You are a payment receipt parser. Extract the following fields from this payment screenshot/receipt image. Return ONLY valid JSON with no markdown or code blocks.

Required JSON structure:
{
  "amount": <number or null>,
  "reference_number": <string or null>,
  "payment_datetime": <ISO 8601 string or null>,
  "sender_name": <string or null>,
  "confidence": <"high" | "medium" | "low">
}

Rules:
- amount: the total amount sent (not fees), as a plain number (e.g. 150.00)
- reference_number: transaction ID, reference code, or confirmation number visible in the receipt
- payment_datetime: date and time of the transaction in ISO 8601 format (assume UTC+8 if no timezone shown)
- sender_name: the name of the sender account if visible, otherwise null
- confidence: "high" if all fields are clearly visible, "medium" if some fields are unclear, "low" if the image is hard to read or doesn't look like a payment receipt
- If a field cannot be found, use null`,
            },
          ],
        },
      ],
    })

    // Parse the JSON response
    const rawText =
      message.content[0] && message.content[0].type === 'text'
        ? message.content[0].text
        : ''

    let extractedData: ExtractedData = {
      amount: null,
      reference_number: null,
      payment_datetime: null,
      sender_name: null,
      confidence: 'failed',
    }

    try {
      const parsed = JSON.parse(rawText)
      extractedData = {
        amount: typeof parsed.amount === 'number' ? parsed.amount : null,
        reference_number:
          typeof parsed.reference_number === 'string'
            ? parsed.reference_number
            : null,
        payment_datetime:
          typeof parsed.payment_datetime === 'string'
            ? parsed.payment_datetime
            : null,
        sender_name:
          typeof parsed.sender_name === 'string' ? parsed.sender_name : null,
        confidence: ['high', 'medium', 'low'].includes(parsed.confidence)
          ? parsed.confidence
          : 'low',
      }
    } catch (parseError) {
      void logError('payment_proof.extract.json_parse_failed', parseError)
      extractedData.confidence = 'failed'
    }

    // Update registration_payments with extracted data
    const { error: updateError } = await updatePaymentExtraction(serviceClient, paymentId!, {
      extracted_amount: extractedData.amount,
      extracted_reference: extractedData.reference_number,
      extracted_datetime: extractedData.payment_datetime,
      extracted_sender: extractedData.sender_name,
      extraction_confidence: extractedData.confidence,
      extracted_raw: { model: 'claude-haiku-4-5-20251001', raw_text: rawText },
      extraction_status: extractedData.confidence === 'failed' ? 'failed' : 'done',
    })

    if (updateError) {
      void logError('payment_proof.extract.update_failed', updateError, authUser.id, { payment_id: paymentId })
    } else {
      // Log successful extraction
      await logActivity('payment_proof.extract_success', authUser.id, {
        payment_id: paymentId,
        amount: extractedData.amount,
        confidence: extractedData.confidence,
        has_reference: !!extractedData.reference_number,
        has_sender: !!extractedData.sender_name,
      })
    }

    return NextResponse.json({
      success: true,
      extracted: extractedData,
    })
  } catch (error) {
    void logError('payment_proof.extract.unhandled', error instanceof Error ? error : new Error(String(error)))
    // Best-effort: mark extraction failed so admin knows to review manually
    if (paymentId) {
      const svcClient = createServiceClient()
      void updatePaymentExtraction(svcClient, paymentId, { extraction_status: 'failed' })
    }
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
