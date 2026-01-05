'use client'

import { useState, useEffect, useRef } from 'react'

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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-focus the input when the picker opens
    inputRef.current?.focus()
  }, [])

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
      <div className="absolute z-50 bg-white border-2 border-peach-300 rounded-lg shadow-lg p-3 mt-2 min-w-[220px]">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-peach-200">
          <span className="text-xs font-medium text-cream-900">Choose an emoji</span>
          <button
            onClick={onClose}
            className="text-cream-600 hover:text-cream-900 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleCustomSubmit} className="mb-3">
          <label className="text-xs text-cream-700 mb-1 block">
            Type or paste emoji:
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={customEmoji}
              onChange={(e) => setCustomEmoji(e.target.value)}
              placeholder=""
              maxLength={4}
              className="flex-1 text-cream-900 border border-peach-200 rounded px-3 py-2 text-2xl focus:outline-none focus:ring-2 focus:ring-sage-500 text-center"
            />
          </div>
          <button
            type="submit"
            disabled={!customEmoji.trim()}
            className="w-full mt-2 bg-sage-500 text-white py-1 rounded hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Use This Emoji
          </button>
        </form>

        <button
          onClick={() => {
            onSelect('')
            onClose()
          }}
          className="w-full mt-3 pt-3 border-t border-peach-200 text-xs text-cream-700 hover:text-cream-900"
        >
          Remove emoji
        </button>
      </div>
    </>
  )
}
