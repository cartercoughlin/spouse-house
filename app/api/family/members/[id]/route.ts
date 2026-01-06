import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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

    const memberId = params.id

    // Get the family member to be removed
    const { data: memberToRemove, error: memberError } = await supabase
      .from('family_members')
      .select('id, family_id, user_id, role')
      .eq('id', memberId)
      .single()

    if (memberError || !memberToRemove) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 })
    }

    // Check if current user is in the same family
    const { data: currentUserMember, error: currentUserError } = await supabase
      .from('family_members')
      .select('family_id, role')
      .eq('user_id', user.id)
      .eq('family_id', memberToRemove.family_id)
      .single()

    if (currentUserError || !currentUserMember) {
      return NextResponse.json({ error: 'You are not in this family' }, { status: 403 })
    }

    // Check permissions: user can remove themselves, or owner can remove others
    const canRemove =
      memberToRemove.user_id === user.id || // Removing themselves
      (currentUserMember.role === 'owner' && memberToRemove.role !== 'owner') // Owner removing non-owner

    if (!canRemove) {
      return NextResponse.json({ error: 'You do not have permission to remove this member' }, { status: 403 })
    }

    // Prevent owner from removing themselves if they're the only owner
    if (memberToRemove.user_id === user.id && memberToRemove.role === 'owner') {
      const { data: owners, error: ownersError } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', memberToRemove.family_id)
        .eq('role', 'owner')

      if (!ownersError && owners && owners.length === 1) {
        return NextResponse.json(
          { error: 'Cannot remove the only owner. Transfer ownership or delete the family first.' },
          { status: 400 }
        )
      }
    }

    // Remove the family member
    const { error: deleteError } = await supabase.from('family_members').delete().eq('id', memberId)

    if (deleteError) {
      console.error('Error removing family member:', deleteError)
      return NextResponse.json({ error: 'Failed to remove family member' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Family member removed successfully',
    })
  } catch (error) {
    console.error('Error in DELETE /api/family/members/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
