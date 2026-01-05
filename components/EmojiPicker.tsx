'use client'

import { useState } from 'react'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

const COMMON_EMOJIS = [
  '💰', '🏦', '💳', '💵', '💸',
  '🏠', '🏡', '🏢', '🏭', '🏪',
  '💡', '⚡', '🔌', '💧', '🔥',
  '📱', '💻', '📺', '🎮', '🎵',
  '🚗', '⛽', '🚙', '🚕', '✈️',
  '🍔', '☕', '🍕', '🛒', '🎯',
  '📦', '📮', '📧', '📞', '🔔',
  '⭐', '🎁', '🎉', '❤️', '✅',
]

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [customEmoji, setCustomEmoji] = useState('')

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (customEmoji.trim()) {
      onSelect(customEmoji.trim())
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Picker */}
      <div className="absolute z-50 bg-white border-2 border-peach-300 rounded-lg shadow-lg p-3 mt-2">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-peach-200">
          <span className="text-xs font-medium text-cream-900">Select an emoji</span>
          <button
            onClick={onClose}
            className="text-cream-600 hover:text-cream-900 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2 max-w-[200px] mb-3">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSelect(emoji)
                onClose()
              }}
              className="text-2xl hover:bg-peach-100 rounded p-1 transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>

        <form onSubmit={handleCustomSubmit} className="border-t border-peach-200 pt-2">
          <label className="text-xs text-cream-700 mb-1 block">Or type/paste any emoji:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customEmoji}
              onChange={(e) => setCustomEmoji(e.target.value)}
              placeholder="🎨"
              maxLength={4}
              className="flex-1 text-cream-900 border border-peach-200 rounded px-2 py-1 text-lg focus:outline-none focus:ring-2 focus:ring-sage-500"
            />
            <button
              type="submit"
              className="bg-sage-500 text-white px-3 py-1 rounded text-xs hover:bg-sage-600"
            >
              Use
            </button>
          </div>
        </form>

        <button
          onClick={() => {
            onSelect('')
            onClose()
          }}
          className="w-full mt-2 pt-2 border-t border-peach-200 text-xs text-cream-700 hover:text-cream-900"
        >
          Remove emoji
        </button>
      </div>
    </>
  )
}
