import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Get credentials for an account
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'Missing account ID' }, { status: 400 })
    }

    // Verify user has access to this account (through family membership)
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found or access denied' }, { status: 404 })
    }

    const { data: credential, error } = await supabase
      .from('account_credentials')
      .select('id, username_encrypted, password_encrypted, notes_encrypted, iv, created_at, updated_at')
      .eq('account_id', accountId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is OK
      console.error('Error fetching credential:', error)
      return NextResponse.json({ error: 'Failed to fetch credential' }, { status: 500 })
    }

    return NextResponse.json({ credential: credential || null })
  } catch (error) {
    console.error('Error in GET /api/credentials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create or update credentials for an account
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
    const { accountId, usernameEncrypted, passwordEncrypted, notesEncrypted, iv } = body

    if (!accountId || !iv) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user owns this account (only owners can add credentials)
    const { data: account } = await supabase
      .from('accounts')
      .select('id, user_id')
      .eq('id', accountId)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Check if credential already exists
    const { data: existing } = await supabase
      .from('account_credentials')
      .select('id')
      .eq('account_id', accountId)
      .single()

    let result
    if (existing) {
      // Update existing credential
      const { data, error } = await supabase
        .from('account_credentials')
        .update({
          username_encrypted: usernameEncrypted,
          password_encrypted: passwordEncrypted,
          notes_encrypted: notesEncrypted,
          iv,
        })
        .eq('id', existing.id)
        .eq('user_id', user.id) // Only owner can update
        .select()
        .single()

      if (error) {
        console.error('Error updating credential:', error)
        return NextResponse.json({ error: 'Failed to update credential' }, { status: 500 })
      }
      result = data
    } else {
      // Create new credential
      const { data, error } = await supabase
        .from('account_credentials')
        .insert({
          account_id: accountId,
          user_id: user.id,
          username_encrypted: usernameEncrypted,
          password_encrypted: passwordEncrypted,
          notes_encrypted: notesEncrypted,
          iv,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating credential:', error)
        return NextResponse.json({ error: 'Failed to create credential' }, { status: 500 })
      }
      result = data
    }

    return NextResponse.json({ success: true, credential: result })
  } catch (error) {
    console.error('Error in POST /api/credentials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove credentials for an account
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'Missing account ID' }, { status: 400 })
    }

    const { error } = await supabase
      .from('account_credentials')
      .delete()
      .eq('account_id', accountId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting credential:', error)
      return NextResponse.json({ error: 'Failed to delete credential' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/credentials:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
