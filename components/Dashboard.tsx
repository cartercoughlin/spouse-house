'use client'

import AccountCard from './AccountCard'
import AddAccountModal from './AddAccountModal'
import FamilyModal from './FamilyModal'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

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

interface DashboardProps {
  initialAccounts: Account[]
  user: any
}

export default function Dashboard({ initialAccounts, user }: DashboardProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const copyResetRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  useEffect(() => {
    return () => {
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current)
      }
    }
  }, [])


  const handleCopyEmail = async () => {
    const email = 'bills@bloombudget.xyz'
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(email)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = email
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopiedEmail(true)
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current)
      }
      copyResetRef.current = setTimeout(() => setCopiedEmail(false), 2000)
    } catch (error) {
      console.error('Failed to copy email address', error)
    }
  }

  const filteredAccounts = accounts.filter(account => {
    const query = searchQuery.toLowerCase()

    // Search in account fields
    const matchesAccount =
      account.name.toLowerCase().includes(query) ||
      account.category?.toLowerCase().includes(query) ||
      account.notes?.toLowerCase().includes(query)

    // Search in email content
    const matchesEmail = account.emails.some(email =>
      email.subject.toLowerCase().includes(query) ||
      email.body?.toLowerCase().includes(query) ||
      email.from_address.toLowerCase().includes(query)
    )

    return matchesAccount || matchesEmail
  })

  const handleAccountAdded = () => {
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-cream-300">
      {/* Header */}
      <div className="bg-cream-100 border-b bg-cream-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/icon.png"
              alt="Spouse House icon"
              width={40}
              height={40}
              className="rounded-lg"
              priority
            />
            <h1 className="text-2xl font-bold text-cream-900">Spouse House</h1>
          </div>
          <button
            onClick={() => setIsFamilyModalOpen(true)}
            className="text-cream-800 hover:text-cream-900 p-2 rounded-lg hover:bg-cream-300 transition"
            aria-label="Family"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Search and Add */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 text-cream-900 bg-white border border-peach-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500 placeholder:text-cream-500"
          />
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-sage-500 text-white px-6 py-2 rounded-lg hover:bg-sage-600 whitespace-nowrap"
          >
            Add Account
          </button>
        </div>

        {/* Email Forward Info */}
        <div className="bg-sky-100 border border-sky-300 rounded-lg p-4 text-sm">
          <p className="font-medium text-sky-900 mb-1">Forward emails to add accounts automatically:</p>
          <div className="flex items-center gap-2">
            <code className="bg-sky-200 px-2 py-1 rounded text-sky-900">
              bills@bloombudget.xyz
            </code>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="p-1 rounded hover:bg-sky-200 text-sky-900 transition"
              aria-label="Copy email address"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4c0-1.1.9-2 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            {copiedEmail && <span className="text-xs text-sky-800">Copied!</span>}
          </div>
        </div>

        {/* Accounts List */}
        <div className="space-y-3">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-12 text-cream-700">
              {searchQuery ? 'No accounts found' : 'No accounts yet. Add one to get started!'}
            </div>
          ) : (
            filteredAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                userId={user?.id}
                userEmail={user?.email}
              />
            ))
          )}
        </div>
      </div>

      {/* Add Account Modal */}
      {isAddModalOpen && (
        <AddAccountModal
          onClose={() => setIsAddModalOpen(false)}
          onAccountAdded={handleAccountAdded}
        />
      )}

      {/* Family Modal */}
      {isFamilyModalOpen && (
        <FamilyModal
          onClose={() => setIsFamilyModalOpen(false)}
          currentUserEmail={user?.email || ''}
        />
      )}
    </div>
  )
}
