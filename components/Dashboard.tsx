'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import AccountCard from './AccountCard'
import AddAccountModal from './AddAccountModal'

interface Email {
  id: string
  subject: string
  from_address: string
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

interface DashboardProps {
  initialAccounts: Account[]
  user: any
}

export default function Dashboard({ initialAccounts, user }: DashboardProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAccountAdded = () => {
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-cream-300">
      {/* Header */}
      <div className="bg-peach-100 border-b border-peach-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-cream-900">Spouse House</h1>
          <button
            onClick={handleSignOut}
            className="text-sm text-cream-800 hover:text-cream-900"
          >
            Sign Out
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
            className="flex-1 px-4 py-2 bg-white border border-peach-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500 placeholder:text-cream-500"
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
          <code className="bg-sky-200 px-2 py-1 rounded text-sky-900">
            bills@bloombudget.xyz
          </code>
        </div>

        {/* Accounts List */}
        <div className="space-y-3">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-12 text-cream-700">
              {searchQuery ? 'No accounts found' : 'No accounts yet. Add one to get started!'}
            </div>
          ) : (
            filteredAccounts.map((account) => (
              <AccountCard key={account.id} account={account} />
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
    </div>
  )
}
