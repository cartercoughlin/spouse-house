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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/credentials/encryption-key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
