import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending invitations for this user's email
    const { data: invitations, error: invitationsError } = await supabase
      .from('family_invitations')
      .select(
        `
        id,
        family_id,
        inviter_id,
        invitee_email,
        status,
        created_at
      `
      )
      .eq('invitee_email', user.email?.toLowerCase())
      .eq('status', 'pending')

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    // Get inviter details for each invitation
    const invitationsWithDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const { data: inviterData, error: inviterError } = await adminClient.auth.admin.getUserById(invitation.inviter_id)
        return {
          id: invitation.id,
          family_id: invitation.family_id,
          inviter_email: inviterData?.user?.email || 'Unknown',
          created_at: invitation.created_at,
        }
      })
    )

    return NextResponse.json({ invitations: invitationsWithDetails })
  } catch (error) {
    console.error('Error in GET /api/family/invitations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
