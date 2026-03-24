/**
 * Test fixture for payment extraction
 * Run this locally to test extraction flow without calling Claude API
 *
 * Usage:
 * 1. Set MOCK_EXTRACTION=true in .env.local
 * 2. Upload a payment proof - extraction will use mock data instead of Claude
 * 3. No tokens consumed during development!
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// Mock extraction data - simulates Claude response
const MOCK_EXTRACTED_DATA = {
  amount: 500.0,
  reference_number: 'REF-20250319-12345',
  payment_datetime: '2025-03-19T14:30:00+08:00',
  sender_name: 'John Doe',
  confidence: 'high' as const,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { registration_id } = body

    if (!registration_id) {
      return NextResponse.json(
        { error: 'Missing registration_id' },
        { status: 400 }
      )
    }

    // Use mock data in development
    const extractedData = MOCK_EXTRACTED_DATA

    // Update registration with mock extracted data
    const serviceClient = createServiceClient()
    const { error: updateError } = await (serviceClient
      .from('registrations') as any)
      .update({
        extracted_amount: extractedData.amount,
        extracted_reference: extractedData.reference_number,
        extracted_datetime: extractedData.payment_datetime,
        extracted_sender: extractedData.sender_name,
        extraction_confidence: extractedData.confidence,
        extracted_raw: {
          source: 'MOCK_DATA',
          note: 'Development testing only - not from Claude API',
        },
      })
      .eq('id', registration_id)

    if (updateError) {
      console.error('[Payment Extraction] Update error:', updateError)
    }

    return NextResponse.json({
      success: true,
      extracted: extractedData,
      note: 'MOCK DATA - Development mode',
    })
  } catch (error) {
    console.error('[Payment Extraction Test] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
