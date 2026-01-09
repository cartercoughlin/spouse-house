'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  clearKeyFromSession,
  decrypt,
  encrypt,
  exportKey,
  generateEncryptionKey,
  getKeyFromSession,
  importKey,
  isPlatformAuthenticatorAvailable,
  storeKeyInSession,
} from '@/lib/crypto'
import {
  authenticateWithCredential,
  getAuthenticatorDisplayName,
  registerCredential,
  StoredCredential,
} from '@/lib/webauthn'

export interface VaultState {
  isUnlocked: boolean
  isLoading: boolean
  hasPasskey: boolean
  error: string | null
  authenticatorName: string
}

export interface DecryptedCredential {
  username: string
  password: string
  notes: string
}

export interface EncryptedCredentialData {
  usernameEncrypted: string | null
  passwordEncrypted: string | null
  notesEncrypted: string | null
  iv: string
}

// Storage key for the encryption key (wrapped/protected by WebAuthn)
const WRAPPED_KEY_STORAGE = 'spouse_house_wrapped_key'

export function usePasswordVault(userId: string | undefined) {
  const [state, setState] = useState<VaultState>({
    isUnlocked: false,
    isLoading: true,
    hasPasskey: false,
    error: null,
    authenticatorName: 'Biometric Authentication',
  })
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null)

  // Check if user has registered passkeys and if vault is unlocked
  useEffect(() => {
    const init = async () => {
      if (!userId) {
        setState((prev) => ({ ...prev, isLoading: false }))
        return
      }

      try {
        // Check for platform authenticator availability
        const platformAvailable = await isPlatformAuthenticatorAvailable()

        // Get authenticator display name
        const authName = getAuthenticatorDisplayName()

        // Check if user has WebAuthn credentials
        const response = await fetch('/api/credentials/webauthn')
        const data = await response.json()

        // Check if there's a key in session storage (already unlocked)
        const sessionKey = getKeyFromSession()
        if (sessionKey) {
          try {
            const key = await importKey(sessionKey)
            setEncryptionKey(key)
            setState({
              isUnlocked: true,
              isLoading: false,
              hasPasskey: data.hasCredentials,
              error: null,
              authenticatorName: authName,
            })
            return
          } catch {
            // Session key is invalid, clear it
            clearKeyFromSession()
          }
        }

        setState({
          isUnlocked: false,
          isLoading: false,
          hasPasskey: data.hasCredentials && platformAvailable,
          error: platformAvailable ? null : 'Biometric authentication not available on this device',
          authenticatorName: authName,
        })
      } catch (error) {
        console.error('Error initializing vault:', error)
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Failed to initialize password vault',
        }))
      }
    }

    init()
  }, [userId])

  // Register a new passkey for the vault
  const setupPasskey = useCallback(
    async (userEmail: string): Promise<boolean> => {
      if (!userId) return false

      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        // Generate a new encryption key
        const newKey = await generateEncryptionKey()
        const exportedKey = await exportKey(newKey)

        // Register WebAuthn credential
        const credential = await registerCredential({
          userId,
          userEmail,
        })

        // Store the credential in the database
        const response = await fetch('/api/credentials/webauthn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credential),
        })

        if (!response.ok) {
          throw new Error('Failed to store passkey')
        }

        // Store wrapped key locally (in a real implementation, this would be encrypted)
        // For simplicity, we store it in localStorage keyed by credential ID
        localStorage.setItem(`${WRAPPED_KEY_STORAGE}_${credential.credentialId}`, exportedKey)

        // Store the key in session for immediate use
        storeKeyInSession(exportedKey)
        setEncryptionKey(newKey)

        setState((prev) => ({
          ...prev,
          isUnlocked: true,
          isLoading: false,
          hasPasskey: true,
        }))

        return true
      } catch (error) {
        console.error('Error setting up passkey:', error)
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to set up passkey',
        }))
        return false
      }
    },
    [userId]
  )

  // Unlock the vault using biometrics
  const unlockVault = useCallback(async (): Promise<boolean> => {
    if (!userId) return false

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      // Get user's registered credentials
      const response = await fetch('/api/credentials/webauthn')
      const data = await response.json()

      if (!data.credentials || data.credentials.length === 0) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'No passkey registered. Please set up a passkey first.',
        }))
        return false
      }

      const credentialIds = data.credentials.map((c: { credential_id: string }) => c.credential_id)

      // Authenticate with WebAuthn
      const authResult = await authenticateWithCredential(credentialIds)

      // Retrieve the wrapped key
      const wrappedKey = localStorage.getItem(`${WRAPPED_KEY_STORAGE}_${authResult.credentialId}`)

      if (!wrappedKey) {
        // Try to find any wrapped key (in case credential ID format changed)
        for (const credId of credentialIds) {
          const key = localStorage.getItem(`${WRAPPED_KEY_STORAGE}_${credId}`)
          if (key) {
            const importedKey = await importKey(key)
            storeKeyInSession(key)
            setEncryptionKey(importedKey)

            setState((prev) => ({
              ...prev,
              isUnlocked: true,
              isLoading: false,
            }))

            return true
          }
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Encryption key not found. You may need to set up your passkey again.',
        }))
        return false
      }

      const key = await importKey(wrappedKey)
      storeKeyInSession(wrappedKey)
      setEncryptionKey(key)

      setState((prev) => ({
        ...prev,
        isUnlocked: true,
        isLoading: false,
      }))

      return true
    } catch (error) {
      console.error('Error unlocking vault:', error)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to unlock vault',
      }))
      return false
    }
  }, [userId])

  // Lock the vault
  const lockVault = useCallback(() => {
    clearKeyFromSession()
    setEncryptionKey(null)
    setState((prev) => ({
      ...prev,
      isUnlocked: false,
    }))
  }, [])

  // Encrypt credentials for storage
  const encryptCredentials = useCallback(
    async (
      username: string,
      password: string,
      notes: string
    ): Promise<EncryptedCredentialData | null> => {
      if (!encryptionKey) return null

      try {
        const [usernameResult, passwordResult, notesResult] = await Promise.all([
          username ? encrypt(username, encryptionKey) : null,
          password ? encrypt(password, encryptionKey) : null,
          notes ? encrypt(notes, encryptionKey) : null,
        ])

        // Use a single IV for all fields (simpler, still secure with unique ciphertext)
        const iv = usernameResult?.iv || passwordResult?.iv || notesResult?.iv || ''

        return {
          usernameEncrypted: usernameResult?.ciphertext || null,
          passwordEncrypted: passwordResult?.ciphertext || null,
          notesEncrypted: notesResult?.ciphertext || null,
          iv,
        }
      } catch (error) {
        console.error('Error encrypting credentials:', error)
        return null
      }
    },
    [encryptionKey]
  )

  // Decrypt credentials from storage
  const decryptCredentials = useCallback(
    async (
      usernameEncrypted: string | null,
      passwordEncrypted: string | null,
      notesEncrypted: string | null,
      iv: string
    ): Promise<DecryptedCredential | null> => {
      if (!encryptionKey) return null

      try {
        const [username, password, notes] = await Promise.all([
          usernameEncrypted ? decrypt(usernameEncrypted, iv, encryptionKey) : '',
          passwordEncrypted ? decrypt(passwordEncrypted, iv, encryptionKey) : '',
          notesEncrypted ? decrypt(notesEncrypted, iv, encryptionKey) : '',
        ])

        return { username, password, notes }
      } catch (error) {
        console.error('Error decrypting credentials:', error)
        return null
      }
    },
    [encryptionKey]
  )

  return {
    ...state,
    setupPasskey,
    unlockVault,
    lockVault,
    encryptCredentials,
    decryptCredentials,
  }
}
