'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EmojiPicker from './EmojiPicker'

interface AddAccountModalProps {
  onClose: () => void
  onAccountAdded: () => void
}

export default function AddAccountModal({ onClose, onAccountAdded }: AddAccountModalProps) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('other')
  const [autopay, setAutopay] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        alert('You must be logged in to add accounts')
        return
      }

      const { error } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          name,
          emoji: emoji || null,
          url: url || null,
          category,
          autopay,
          notes: notes || null,
        })

      if (error) throw error

      onClose()
      window.location.reload()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Add Account</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3 items-start">
            <div className="relative">
              <label className="block text-sm font-medium mb-1 text-cream-900">Icon</label>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-16 h-16 border-2 border-peach-300 rounded-lg flex items-center justify-center text-3xl hover:bg-peach-50 transition-colors"
              >
                {emoji || '➕'}
              </button>
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={(selectedEmoji) => setEmoji(selectedEmoji)}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium mb-1 text-cream-900">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full text-cream-900 border border-peach-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-500 placeholder:text-cream-500"
                placeholder="e.g., Pacific Gas & Electric"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-cream-900">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full text-cream-900 border border-peach-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-500 placeholder:text-cream-500"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-cream-900">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-cream-900 border border-peach-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-500"
            >
              <option value="banking">Banking</option>
              <option value="utility">Utility</option>
              <option value="subscription">Subscription</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autopay}
                onChange={(e) => setAutopay(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-cream-900">Autopay enabled</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-cream-900">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-cream-900 border border-peach-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-500 placeholder:text-cream-500"
              rows={3}
              placeholder="Additional information..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-sage-500 text-white py-2 rounded-lg hover:bg-sage-600 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Account'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-peach-300 py-2 rounded-lg hover:bg-peach-50 text-cream-900"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
