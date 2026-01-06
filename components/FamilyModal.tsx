'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface FamilyMember {
  id: string
  user_id: string
  email: string
  role: 'owner' | 'member'
  joined_at: string
}

interface Invitation {
  id: string
  family_id: string
  inviter_email: string
  created_at: string
}

interface FamilyModalProps {
  onClose: () => void
  currentUserEmail: string
}

export default function FamilyModal({ onClose, currentUserEmail }: FamilyModalProps) {
  const router = useRouter()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'member'>('member')
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    loadFamilyData()
    loadInvitations()
  }, [])

  const loadFamilyData = async () => {
    try {
      const response = await fetch('/api/family/members')
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members || [])
        setCurrentUserRole(data.current_user_role)
      } else {
        console.error('Failed to load family members')
      }
    } catch (err) {
      console.error('Error loading family data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadInvitations = async () => {
    try {
      const response = await fetch('/api/family/invitations')
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations || [])
      }
    } catch (err) {
      console.error('Error loading invitations:', err)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setInviting(true)

    try {
      const response = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message || 'Invitation sent successfully!')
        setInviteEmail('')
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(data.error || 'Failed to send invitation')
      }
    } catch (err) {
      setError('Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleAcceptInvite = async (invitationId: string) => {
    try {
      const response = await fetch('/api/family/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_id: invitationId }),
      })

      if (response.ok) {
        setSuccess('Successfully joined family!')
        setTimeout(() => {
          router.refresh()
          onClose()
        }, 1500)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to accept invitation')
      }
    } catch (err) {
      setError('Failed to accept invitation')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this family member?')) {
      return
    }

    try {
      const response = await fetch(`/api/family/members/${memberId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSuccess('Member removed successfully')
        loadFamilyData()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to remove member')
      }
    } catch (err) {
      setError('Failed to remove member')
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-cream-100 border-b border-cream-300 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-cream-900">Family</h2>
          <button
            onClick={onClose}
            className="text-cream-600 hover:text-cream-900 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">Pending Invitations</h3>
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between bg-white p-3 rounded border border-blue-200"
                  >
                    <div>
                      <p className="text-sm text-blue-900">
                        <span className="font-medium">{invitation.inviter_email}</span> invited you to join their
                        family
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAcceptInvite(invitation.id)}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                    >
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invite Form */}
          <div className="bg-sage-50 border border-sage-300 rounded-lg p-4">
            <h3 className="font-semibold text-sage-900 mb-3">Invite Family Member</h3>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 px-3 py-2 border border-sage-300 rounded focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
                required
              />
              <button
                type="submit"
                disabled={inviting}
                className="bg-sage-500 text-white px-4 py-2 rounded hover:bg-sage-600 disabled:bg-sage-300 whitespace-nowrap text-sm"
              >
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </form>
            <p className="text-xs text-sage-700 mt-2">
              Invited users will need to sign in or sign up with the invited email address to join your family.
            </p>
          </div>

          {/* Family Members */}
          <div>
            <h3 className="font-semibold text-cream-900 mb-3">Family Members ({members.length})</h3>
            {loading ? (
              <p className="text-cream-600 text-sm">Loading...</p>
            ) : members.length === 0 ? (
              <p className="text-cream-600 text-sm">No family members yet</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const isCurrentUser = member.email === currentUserEmail
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between bg-cream-50 p-3 rounded border border-cream-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sage-200 rounded-full flex items-center justify-center">
                          <span className="text-sage-700 font-semibold text-lg">
                            {member.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-cream-900">
                            {member.email}
                            {isCurrentUser && <span className="ml-2 text-xs text-sage-600">(You)</span>}
                          </p>
                          <p className="text-xs text-cream-600">
                            {member.role === 'owner' ? 'Owner' : 'Member'} • Joined{' '}
                            {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {currentUserRole === 'owner' && !isCurrentUser && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                      {isCurrentUser && currentUserRole !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-cream-600 hover:text-cream-800 text-sm"
                        >
                          Leave Family
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sign Out Button */}
          <div className="pt-4 border-t border-cream-300">
            <button
              onClick={handleSignOut}
              className="w-full bg-cream-200 text-cream-900 px-4 py-3 rounded-lg hover:bg-cream-300 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
