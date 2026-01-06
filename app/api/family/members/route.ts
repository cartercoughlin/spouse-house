import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
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

    // Get user's family
    const { data: familyMember, error: familyMemberError } = await supabase
      .from('family_members')
      .select('family_id, role')
      .eq('user_id', user.id)
      .single()

    if (familyMemberError || !familyMember) {
      return NextResponse.json({ error: 'No family found' }, { status: 404 })
    }

    // Get all family members with stored emails
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select(
        `
        id,
        user_id,
        user_email,
        role,
        joined_at
      `
      )
      .eq('family_id', familyMember.family_id)

    if (membersError) {
      console.error('Error fetching family members:', membersError)
      return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500 })
    }

    // Map to expected format with stored emails
    const membersWithDetails = members.map((member) => ({
      id: member.id,
      user_id: member.user_id,
      email: member.user_email || 'Unknown',
      role: member.role,
      joined_at: member.joined_at,
    }))

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
