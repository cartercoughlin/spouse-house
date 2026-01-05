'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Email {
  id: string
  subject: string
  amount: number | null
  received_at: string
}

interface Account {
  id: string
  name: string
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
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this account?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', account.id)

    if (!error) {
      router.refresh()
    }
  }

  const handleSave = async () => {
    const supabase = createClient()
    const { error } = await supabase
      .from('accounts')
      .update({
        name: editedAccount.name,
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
      router.refresh()
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
    <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editedAccount.name}
              onChange={(e) => setEditedAccount({ ...editedAccount, name: e.target.value })}
              className="font-semibold text-lg border border-amber-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          ) : (
            <h3 className="font-semibold text-lg">{account.name}</h3>
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
              <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">
                Due: {account.due_date}th
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-amber-400 hover:text-amber-600 ml-2"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-3">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-amber-700">URL</label>
                <input
                  type="url"
                  value={editedAccount.url || ''}
                  onChange={(e) => setEditedAccount({ ...editedAccount, url: e.target.value })}
                  className="w-full border border-amber-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-amber-400"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="text-xs text-amber-700">Category</label>
                <select
                  value={editedAccount.category || 'other'}
                  onChange={(e) => setEditedAccount({ ...editedAccount, category: e.target.value })}
                  className="w-full border border-amber-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                <label className="text-xs text-amber-700">Notes</label>
                <textarea
                  value={editedAccount.notes || ''}
                  onChange={(e) => setEditedAccount({ ...editedAccount, notes: e.target.value })}
                  className="w-full border border-amber-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-amber-400"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="bg-amber-600 text-white px-4 py-2 rounded text-sm hover:bg-amber-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditedAccount(account)
                  }}
                  className="border border-amber-300 px-4 py-2 rounded text-sm hover:bg-amber-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {account.url && (
                <div>
                  <div className="text-xs text-gray-600">URL</div>
                  <a
                    href={account.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-amber-700 hover:underline break-all"
                  >
                    {account.url}
                  </a>
                </div>
              )}

              {account.email_domain && (
                <div>
                  <div className="text-xs text-gray-600">Email Domain</div>
                  <div className="text-sm">{account.email_domain}</div>
                </div>
              )}

              {account.notes && (
                <div>
                  <div className="text-xs text-gray-600">Notes</div>
                  <div className="text-sm text-gray-700">{account.notes}</div>
                </div>
              )}

              {account.emails && account.emails.length > 0 && (
                <div>
                  <div className="text-xs text-amber-700 mb-2">Recent Emails ({account.emails.length})</div>
                  <div className="space-y-2">
                    {account.emails.slice(0, 3).map((email) => (
                      <div key={email.id} className="text-sm bg-amber-50 p-2 rounded border border-amber-200">
                        <div className="font-medium">{email.subject}</div>
                        <div className="text-xs text-amber-700 flex justify-between mt-1">
                          <span>{new Date(email.received_at).toLocaleDateString()}</span>
                          {email.amount && <span className="font-medium">${email.amount}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-amber-700 hover:text-amber-900 font-medium"
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
    </div>
  )
}
