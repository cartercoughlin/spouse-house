import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Retrieve user's encryption key
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: keyData, error } = await supabase
      .from('user_encryption_keys')
      .select('encryption_key')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching encryption key:', error)
      return NextResponse.json({ error: 'Failed to fetch encryption key' }, { status: 500 })
    }

    // Debug logging
    console.log('[GET encryption-key] user_id:', user.id)
    console.log('[GET encryption-key] keyData:', keyData ? 'row exists' : 'no row')
    console.log('[GET encryption-key] encryption_key present:', !!keyData?.encryption_key)
    console.log('[GET encryption-key] key length:', keyData?.encryption_key?.length || 0)
    console.log('[GET encryption-key] key first 10 chars:', keyData?.encryption_key?.substring(0, 10) || 'N/A')

    return NextResponse.json({
      encryptionKey: keyData?.encryption_key || null,
      hasKey: !!keyData?.encryption_key
    })
  } catch (error) {
    console.error('Error in GET /api/credentials/encryption-key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Store user's encryption key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { encryptionKey } = body

    if (!encryptionKey) {
      return NextResponse.json({ error: 'Missing encryption key' }, { status: 400 })
    }

    console.log('[POST encryption-key] Storing key, length:', encryptionKey.length)
    console.log('[POST encryption-key] Key first 10 chars:', encryptionKey.substring(0, 10))

    // Use upsert to insert or update in one operation
    const { error } = await supabase
      .from('user_encryption_keys')
      .upsert(
        {
          user_id: user.id,
          encryption_key: encryptionKey,
        },
        {
          onConflict: 'user_id',
        }
      )

    if (error) {
      console.error('Error storing encryption key:', error)
      return NextResponse.json({ error: 'Failed to store encryption key' }, { status: 500 })
    }

    // Verify it was stored correctly
    const { data: verifyData } = await supabase
      .from('user_encryption_keys')
      .select('encryption_key')
      .eq('user_id', user.id)
      .single()

    console.log('[POST encryption-key] Verified stored key first 10 chars:', verifyData?.encryption_key?.substring(0, 10))
    console.log('[POST encryption-key] Keys match:', verifyData?.encryption_key === encryptionKey)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/credentials/encryption-key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
