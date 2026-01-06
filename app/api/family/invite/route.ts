import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Check if user is trying to invite themselves
    if (email.toLowerCase() === user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 })
    }

    // Get user's family
    const { data: familyMember, error: familyMemberError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .single()

    if (familyMemberError || !familyMember) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 })
    }

    // Check if the email is already a member of this family
    const { data: existingMember } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', familyMember.family_id)
      .eq('user_id', supabase.auth.admin.getUserById(email))
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a family member' }, { status: 400 })
    }

    // Check if there's already a pending invitation for this email
    const { data: existingInvite } = await supabase
      .from('family_invitations')
      .select('id')
      .eq('family_id', familyMember.family_id)
      .eq('invitee_email', email.toLowerCase())
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      return NextResponse.json({ error: 'An invitation has already been sent to this email' }, { status: 400 })
    }

    // Create the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('family_invitations')
      .insert({
        family_id: familyMember.family_id,
        inviter_id: user.id,
        inviter_email: user.email, // Store inviter email to avoid admin lookups
        invitee_email: email.toLowerCase(),
        status: 'pending',
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      invitation,
      message: `Invitation sent to ${email}. They can accept it by signing in with that email.`
    })
  } catch (error) {
    console.error('Error in POST /api/family/invite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
