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
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!invitation.inviter_id || !uuidRegex.test(invitation.inviter_id)) {
          console.error('Invalid inviter_id:', invitation.inviter_id)
          return {
            id: invitation.id,
            family_id: invitation.family_id,
            inviter_email: 'Invalid User',
            created_at: invitation.created_at,
          }
        }

        try {
          const { data: inviterData, error: inviterError } = await adminClient.auth.admin.getUserById(invitation.inviter_id)
          if (inviterError) {
            console.error('Error fetching inviter:', inviterError, 'for inviter_id:', invitation.inviter_id)
          }
          return {
            id: invitation.id,
            family_id: invitation.family_id,
            inviter_email: inviterData?.user?.email || 'Unknown',
            created_at: invitation.created_at,
          }
        } catch (err) {
          console.error('Exception fetching inviter:', err, 'for inviter_id:', invitation.inviter_id)
          return {
            id: invitation.id,
            family_id: invitation.family_id,
            inviter_email: 'Error',
            created_at: invitation.created_at,
          }
        }
      })
    )

    return NextResponse.json({ invitations: invitationsWithDetails })
  } catch (error) {
    console.error('Error in GET /api/family/invitations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
