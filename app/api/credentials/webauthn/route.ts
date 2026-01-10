import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - List user's WebAuthn credentials
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

    const { data: credentials, error } = await supabase
      .from('webauthn_credentials')
      .select('id, credential_id, device_type, created_at, last_used_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching WebAuthn credentials:', error)
      return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 })
    }

    return NextResponse.json({ credentials, hasCredentials: credentials.length > 0 })
  } catch (error) {
    console.error('Error in GET /api/credentials/webauthn:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Register a new WebAuthn credential
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
    const { credentialId, publicKey, deviceType, backedUp, transports } = body

    if (!credentialId || !publicKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if credential already exists
    const { data: existing } = await supabase
      .from('webauthn_credentials')
      .select('id')
      .eq('credential_id', credentialId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Credential already registered' }, { status: 409 })
    }

    const { data: credential, error } = await supabase
      .from('webauthn_credentials')
      .insert({
        user_id: user.id,
        credential_id: credentialId,
        public_key: publicKey,
        device_type: deviceType || 'platform',
        backed_up: backedUp || false,
        transports: transports || [],
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating WebAuthn credential:', error)
      return NextResponse.json({ error: 'Failed to register credential' }, { status: 500 })
    }

    return NextResponse.json({ success: true, credential })
  } catch (error) {
    console.error('Error in POST /api/credentials/webauthn:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove a WebAuthn credential
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
    const credentialId = searchParams.get('id')

    if (!credentialId) {
      return NextResponse.json({ error: 'Missing credential ID' }, { status: 400 })
    }

    const { error } = await supabase
      .from('webauthn_credentials')
      .delete()
      .eq('id', credentialId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting WebAuthn credential:', error)
      return NextResponse.json({ error: 'Failed to delete credential' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/credentials/webauthn:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
