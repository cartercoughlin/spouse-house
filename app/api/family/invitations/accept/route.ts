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

    const { invitation_id } = await request.json()

    if (!invitation_id) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
    }

    // Get the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('family_invitations')
      .select('*')
      .eq('id', invitation_id)
      .eq('invitee_email', user.email?.toLowerCase())
      .eq('status', 'pending')
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found or already processed' }, { status: 404 })
    }

    // Check if user is already in a family
    const { data: existingMembership } = await supabase
      .from('family_members')
      .select('id, family_id')
      .eq('user_id', user.id)
      .single()

    if (existingMembership) {
      // Check if user is the only member of their current family
      const { data: familyMembers } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', existingMembership.family_id)

      if (familyMembers && familyMembers.length === 1) {
        // User is the only member, safe to leave and join new family
        await supabase
          .from('family_members')
          .delete()
          .eq('id', existingMembership.id)

        // Delete the now-empty family
        await supabase
          .from('families')
          .delete()
          .eq('id', existingMembership.family_id)
      } else {
        // User is in a family with other members
        return NextResponse.json(
          { error: 'You are already in a family with other members. Leave your current family first to accept this invitation.' },
          { status: 400 }
        )
      }
    }

    // Add user to the family
    const { error: addMemberError } = await supabase.from('family_members').insert({
      family_id: invitation.family_id,
      user_id: user.id,
      user_email: user.email, // Store email to avoid lookups
      role: 'member',
    })

    if (addMemberError) {
      console.error('Error adding family member:', addMemberError)
      return NextResponse.json({ error: 'Failed to join family' }, { status: 500 })
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('family_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation_id)

    if (updateError) {
      console.error('Error updating invitation:', updateError)
      // Non-critical error, we already added the member
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined family!',
    })
  } catch (error) {
    console.error('Error in POST /api/family/invitations/accept:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
