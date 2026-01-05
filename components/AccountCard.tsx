'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Email {
  id: string
  subject: string
  from_address: string
  body: string | null
  amount: number | null
  received_at: string
}

interface Account {
  id: string
  name: string
  emoji: string | null
  url: string | null
  category: string | null
  email_domain: string | null
  autopay: boolean
  billing_cycle: string | null
  due_date: number | null
  average_amount: number | null
  notes: string | null
  emails: Email[]
}

interface AccountCardProps {
  account: Account
}

export default function AccountCard({ account }: AccountCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedAccount, setEditedAccount] = useState(account)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this account?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', account.id)

    if (!error) {
      window.location.reload()
    }
  }

  const handleSave = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from('accounts')
      .update({
        name: editedAccount.name,
        emoji: editedAccount.emoji,
        url: editedAccount.url,
        category: editedAccount.category,
        autopay: editedAccount.autopay,
        billing_cycle: editedAccount.billing_cycle,
        due_date: editedAccount.due_date,
        average_amount: editedAccount.average_amount,
        notes: editedAccount.notes,
      })
      .eq('id', account.id)

    if (!error) {
      setIsEditing(false)
      window.location.reload()
    }
  }

  const categoryColors: Record<string, string> = {
    banking: 'bg-emerald-100 text-emerald-800',
    utility: 'bg-sky-100 text-sky-800',
    subscription: 'bg-violet-100 text-violet-800',
    insurance: 'bg-amber-100 text-amber-800',
    other: 'bg-stone-100 text-stone-800',
  }

  return (
    <div className="bg-white border border-peach-200 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div
        className="flex items-start justify-between cursor-pointer hover:bg-cream-50 -m-4 p-4 rounded-lg transition-colors"
        onClick={() => !isEditing && setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editedAccount.name}
              onChange={(e) => setEditedAccount({ ...editedAccount, name: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-lg text-cream-900 border border-peach-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-sage-500"
            />
          ) : (
            <div className="flex items-center gap-2">
              {account.emoji ? (
                <span className="text-2xl">{account.emoji}</span>
              ) : account.email_domain ? (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${account.email_domain}&sz=64`}
                  alt={`${account.name} icon`}
                  className="w-6 h-6 rounded"
                  onError={(e) => {
                    // Hide icon if it fails to load
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : null}
              <h3 className="font-semibold text-lg text-cream-900">{account.name}</h3>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            {account.category && (
              <span className={`text-xs px-2 py-1 rounded ${categoryColors[account.category] || categoryColors.other}`}>
                {account.category}
              </span>
            )}
            {account.autopay && (
              <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                Autopay
              </span>
            )}
            {account.due_date && (
              <span className="text-xs px-2 py-1 rounded bg-peach-100 text-peach-700">
                Due: {account.due_date}th
              </span>
            )}
          </div>
        </div>

        <div className="text-peach-400 hover:text-peach-600 ml-2 text-2xl leading-none">
          {isExpanded ? '−' : '+'}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-3">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-cream-700">Icon Emoji</label>
                <input
                  type="text"
                  value={editedAccount.emoji || ''}
                  onChange={(e) => setEditedAccount({ ...editedAccount, emoji: e.target.value })}
                  maxLength={2}
                  className="w-full text-cream-900 border border-peach-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 placeholder:text-cream-500 text-2xl"
                  placeholder="💰"
                />
              </div>

              <div>
                <label className="text-xs text-cream-700">URL</label>
                <input
                  type="url"
                  value={editedAccount.url || ''}
                  onChange={(e) => setEditedAccount({ ...editedAccount, url: e.target.value })}
                  className="w-full text-cream-900 border border-peach-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 placeholder:text-cream-500"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="text-xs text-cream-700">Category</label>
                <select
                  value={editedAccount.category || 'other'}
                  onChange={(e) => setEditedAccount({ ...editedAccount, category: e.target.value })}
                  className="w-full text-cream-900 border border-peach-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500"
                >
                  <option value="banking">Banking</option>
                  <option value="utility">Utility</option>
                  <option value="subscription">Subscription</option>
                  <option value="insurance">Insurance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-2">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={editedAccount.autopay}
                    onChange={(e) => setEditedAccount({ ...editedAccount, autopay: e.target.checked })}
                    className="mr-2"
                  />
                  Autopay
                </label>
              </div>

              <div>
                <label className="text-xs text-cream-700">Notes</label>
                <textarea
                  value={editedAccount.notes || ''}
                  onChange={(e) => setEditedAccount({ ...editedAccount, notes: e.target.value })}
                  className="w-full text-cream-900 border border-peach-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500 placeholder:text-cream-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="bg-sage-500 text-white px-4 py-2 rounded text-sm hover:bg-sage-600"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditedAccount(account)
                  }}
                  className="border border-peach-300 px-4 py-2 rounded text-sm hover:bg-peach-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {account.url && (
                <div>
                  <div className="text-xs font-medium text-cream-800 mb-1">URL</div>
                  <a
                    href={account.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-sage-700 hover:underline break-all"
                  >
                    {account.url}
                  </a>
                </div>
              )}

              {account.email_domain && (
                <div>
                  <div className="text-xs font-medium text-cream-800 mb-1">Email Domain</div>
                  <div className="text-sm text-cream-900">{account.email_domain}</div>
                </div>
              )}

              {account.notes && (
                <div>
                  <div className="text-xs font-medium text-cream-800 mb-1">Notes</div>
                  <div className="text-sm text-cream-900">{account.notes}</div>
                </div>
              )}

              {account.emails && account.emails.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-cream-800 mb-2">Recent Emails ({account.emails.length})</div>
                  <div className="space-y-2">
                    {account.emails.slice(0, 3).map((email) => (
                      <button
                        key={email.id}
                        onClick={() => setSelectedEmail(email)}
                        className="w-full text-left text-sm bg-sky-50 p-2 rounded border border-sky-200 hover:bg-sky-100 transition-colors"
                      >
                        <div className="font-medium text-cream-900">{email.subject}</div>
                        <div className="text-xs text-sky-800 flex justify-between mt-1">
                          <span>{new Date(email.received_at).toLocaleDateString()}</span>
                          {email.amount && <span className="font-medium">${email.amount}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-sage-700 hover:text-sage-900 font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="text-sm text-red-700 hover:text-red-900 font-medium"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Email Viewer Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedEmail(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-peach-200 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-cream-900">Email Details</h2>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-cream-600 hover:text-cream-900 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-xs font-medium text-cream-800 mb-1">Subject</div>
                <div className="text-lg font-semibold text-cream-900">{selectedEmail.subject}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-cream-800 mb-1">From</div>
                  <div className="text-sm text-cream-900">{selectedEmail.from_address}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-cream-800 mb-1">Received</div>
                  <div className="text-sm text-cream-900">{new Date(selectedEmail.received_at).toLocaleString()}</div>
                </div>
              </div>

              {selectedEmail.amount && (
                <div>
                  <div className="text-xs font-medium text-cream-800 mb-1">Amount</div>
                  <div className="text-2xl font-bold text-sage-700">${selectedEmail.amount.toFixed(2)}</div>
                </div>
              )}

              <div>
                <div className="text-xs font-medium text-cream-800 mb-2">Email Content</div>
                <div
                  className="bg-cream-50 border border-cream-200 rounded-lg p-4 text-sm text-cream-900 max-h-96 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body || 'No content available' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
