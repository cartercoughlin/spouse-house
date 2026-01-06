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

    // Get user's family
    const { data: familyMember, error: familyMemberError } = await supabase
      .from('family_members')
      .select('family_id, role')
      .eq('user_id', user.id)
      .single()

    if (familyMemberError || !familyMember) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 })
    }

    // Get all family members
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select(
        `
        id,
        user_id,
        role,
        joined_at
      `
      )
      .eq('family_id', familyMember.family_id)

    if (membersError) {
      console.error('Error fetching family members:', membersError)
      return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500 })
    }

    // Get user details for each family member
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!member.user_id || !uuidRegex.test(member.user_id)) {
          console.error('Invalid user_id:', member.user_id)
          return {
            id: member.id,
            user_id: member.user_id,
            email: 'Invalid User',
            role: member.role,
            joined_at: member.joined_at,
          }
        }

        try {
          const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(member.user_id)
          if (userError) {
            console.error('Error fetching user:', userError, 'for user_id:', member.user_id)
          }
          return {
            id: member.id,
            user_id: member.user_id,
            email: userData?.user?.email || 'Unknown',
            role: member.role,
            joined_at: member.joined_at,
          }
        } catch (err) {
          console.error('Exception fetching user:', err, 'for user_id:', member.user_id)
          return {
            id: member.id,
            user_id: member.user_id,
            email: 'Error',
            role: member.role,
            joined_at: member.joined_at,
          }
        }
      })
    )

    return NextResponse.json({
      family_id: familyMember.family_id,
      current_user_role: familyMember.role,
      members: membersWithDetails,
    })
  } catch (error) {
    console.error('Error in GET /api/family/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
