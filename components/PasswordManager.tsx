'use client'

import { useCallback, useEffect, useState } from 'react'
import { DecryptedCredential, usePasswordVault } from '@/hooks/usePasswordVault'

interface PasswordManagerProps {
  accountId: string
  accountName: string
  userId: string
  userEmail: string
  onClose: () => void
}

export default function PasswordManager({
  accountId,
  accountName,
  userId,
  userEmail,
  onClose,
}: PasswordManagerProps) {
  const vault = usePasswordVault(userId)
  const [credentials, setCredentials] = useState<DecryptedCredential | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    notes: '',
  })
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false)

  // Load credentials when vault is unlocked
  useEffect(() => {
    const loadCredentials = async () => {
      if (!vault.isUnlocked) return

      try {
        const response = await fetch(`/api/credentials?accountId=${accountId}`)
        const data = await response.json()

        if (data.credential) {
          setHasStoredCredentials(true)
          const decrypted = await vault.decryptCredentials(
            data.credential.username_encrypted,
            data.credential.password_encrypted,
            data.credential.notes_encrypted,
            data.credential.iv
          )
          if (decrypted) {
            setCredentials(decrypted)
            setFormData(decrypted)
          }
        } else {
          setHasStoredCredentials(false)
          setIsEditing(true) // Open edit mode for new credentials
        }
      } catch (error) {
        console.error('Error loading credentials:', error)
      }
    }

    loadCredentials()
  }, [accountId, vault.isUnlocked, vault.decryptCredentials])

  const handleSetupPasskey = async () => {
    await vault.setupPasskey(userEmail)
  }

  const handleUnlock = async () => {
    await vault.unlockVault()
  }

  const handleSave = async () => {
    if (!vault.isUnlocked) return

    setIsSaving(true)
    try {
      const encrypted = await vault.encryptCredentials(
        formData.username,
        formData.password,
        formData.notes
      )

      if (!encrypted) {
        throw new Error('Failed to encrypt credentials')
      }

      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          ...encrypted,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save credentials')
      }

      setCredentials(formData)
      setHasStoredCredentials(true)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving credentials:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete these credentials?')) return

    try {
      const response = await fetch(`/api/credentials?accountId=${accountId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCredentials(null)
        setFormData({ username: '', password: '', notes: '' })
        setHasStoredCredentials(false)
        setIsEditing(true)
      }
    } catch (error) {
      console.error('Error deleting credentials:', error)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-peach-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-cream-900">Passwords</h2>
            <p className="text-sm text-cream-700">{accountName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-cream-600 hover:text-cream-900 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-6">
          {/* Loading state */}
          {vault.isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-500 mx-auto"></div>
              <p className="mt-4 text-cream-700">Loading...</p>
            </div>
          )}

          {/* Error state */}
          {vault.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">{vault.error}</p>
            </div>
          )}

          {/* Setup passkey (first time) */}
          {!vault.isLoading && !vault.hasPasskey && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-sage-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-cream-900">Set Up {vault.authenticatorName}</h3>
                <p className="text-sm text-cream-700 mt-2">
                  Securely store your passwords and access them instantly with {vault.authenticatorName.toLowerCase()}.
                </p>
              </div>
              <button
                onClick={handleSetupPasskey}
                disabled={vault.isLoading}
                className="bg-sage-500 text-white px-6 py-3 rounded-lg hover:bg-sage-600 disabled:opacity-50 w-full font-medium"
              >
                Enable {vault.authenticatorName}
              </button>
              <p className="text-xs text-cream-600">
                Your passwords are encrypted and can only be accessed with your biometric data.
              </p>
            </div>
          )}

          {/* Locked state - need to authenticate */}
          {!vault.isLoading && vault.hasPasskey && !vault.isUnlocked && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-cream-900">Vault Locked</h3>
                <p className="text-sm text-cream-700 mt-2">
                  Use {vault.authenticatorName.toLowerCase()} to access your passwords.
                </p>
              </div>
              <button
                onClick={handleUnlock}
                disabled={vault.isLoading}
                className="bg-sage-500 text-white px-6 py-3 rounded-lg hover:bg-sage-600 disabled:opacity-50 w-full font-medium"
              >
                Unlock with {vault.authenticatorName}
              </button>
            </div>
          )}

          {/* Unlocked - show/edit credentials */}
          {!vault.isLoading && vault.isUnlocked && (
            <div className="space-y-4">
              {/* Lock button */}
              <div className="flex justify-end">
                <button
                  onClick={vault.lockVault}
                  className="text-sm text-cream-700 hover:text-cream-900 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Lock
                </button>
              </div>

              {isEditing ? (
                /* Edit form */
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-cream-800 block mb-1">
                      Username / Email
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full text-cream-900 border border-peach-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-500"
                      placeholder="username@example.com"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-cream-800 block mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full text-cream-900 border border-peach-200 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-sage-500"
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-600 hover:text-cream-900"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-cream-800 block mb-1">
                      Notes (Security Questions, PINs, etc.)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full text-cream-900 border border-peach-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-500"
                      rows={3}
                      placeholder="Additional secure notes..."
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 bg-sage-500 text-white px-4 py-2 rounded-lg hover:bg-sage-600 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    {hasStoredCredentials && (
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          if (credentials) setFormData(credentials)
                        }}
                        className="px-4 py-2 border border-peach-300 rounded-lg hover:bg-peach-50 text-cream-900"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ) : credentials ? (
                /* View credentials */
                <div className="space-y-4">
                  {credentials.username && (
                    <div>
                      <label className="text-xs font-medium text-cream-800 block mb-1">
                        Username / Email
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-cream-50 border border-cream-200 rounded-lg px-3 py-2 text-cream-900">
                          {credentials.username}
                        </div>
                        <button
                          onClick={() => handleCopy(credentials.username, 'username')}
                          className="p-2 text-cream-600 hover:text-cream-900 hover:bg-cream-100 rounded-lg transition"
                        >
                          {copiedField === 'username' ? (
                            <svg
                              className="w-5 h-5 text-green-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {credentials.password && (
                    <div>
                      <label className="text-xs font-medium text-cream-800 block mb-1">Password</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-cream-50 border border-cream-200 rounded-lg px-3 py-2 text-cream-900 font-mono">
                          {showPassword ? credentials.password : '••••••••••••'}
                        </div>
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-2 text-cream-600 hover:text-cream-900 hover:bg-cream-100 rounded-lg transition"
                        >
                          {showPassword ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                              />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleCopy(credentials.password, 'password')}
                          className="p-2 text-cream-600 hover:text-cream-900 hover:bg-cream-100 rounded-lg transition"
                        >
                          {copiedField === 'password' ? (
                            <svg
                              className="w-5 h-5 text-green-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {credentials.notes && (
                    <div>
                      <label className="text-xs font-medium text-cream-800 block mb-1">Notes</label>
                      <div className="bg-cream-50 border border-cream-200 rounded-lg px-3 py-2 text-cream-900 text-sm whitespace-pre-wrap">
                        {credentials.notes}
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
                </div>
              ) : (
                <div className="text-center py-4 text-cream-700">
                  <p>No credentials saved for this account.</p>
                </div>
              )}
            </div>
          )}

          {/* Security info */}
          <div className="mt-6 pt-4 border-t border-cream-200">
            <div className="flex items-start gap-2 text-xs text-cream-600">
              <svg
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>
                Your credentials are encrypted with AES-256 and can only be accessed with your{' '}
                {vault.authenticatorName.toLowerCase()}. They are never transmitted in plain text.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
