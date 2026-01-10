/**
 * Client-side encryption utilities using Web Crypto API
 * Provides AES-GCM encryption for secure credential storage
 */

// Helper: Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Helper: Convert Uint8Array to base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Helper: Convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes as Uint8Array<ArrayBuffer>
}

// Generate a random encryption key (for initial setup)
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable for export
    ['encrypt', 'decrypt']
  )
}

// Export key to storable format (base64)
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key)
  return arrayBufferToBase64(exported)
}

// Import key from stored format
export async function importKey(keyData: string): Promise<CryptoKey> {
  const keyBuffer = base64ToUint8Array(keyData)
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

// Derive a key from user's master password (for fallback)
export async function deriveKeyFromPassword(
  password: string,
  salt: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)
  const saltBuffer = base64ToUint8Array(salt)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

// Generate random salt for key derivation
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return uint8ArrayToBase64(salt)
}

// Generate random IV for each encryption
export function generateIV(): string {
  const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>
  return uint8ArrayToBase64(iv)
}

// Encrypt data with AES-GCM
export async function encrypt(
  data: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const iv = crypto.getRandomValues(new Uint8Array(12)) as Uint8Array<ArrayBuffer>

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  )

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: uint8ArrayToBase64(iv),
  }
}

// Encrypt data with AES-GCM using a provided IV (for encrypting multiple fields with same IV)
export async function encryptWithIV(
  data: string,
  key: CryptoKey,
  ivBase64: string
): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const iv = base64ToUint8Array(ivBase64)

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  )

  return arrayBufferToBase64(encryptedBuffer)
}

// Decrypt data with AES-GCM
export async function decrypt(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const encryptedBuffer = base64ToUint8Array(ciphertext)
  const ivBuffer = base64ToUint8Array(iv)

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    encryptedBuffer
  )

  const decoder = new TextDecoder()
  return decoder.decode(decryptedBuffer)
}

// Store encryption key securely in session storage (cleared when browser closes)
const KEY_STORAGE_KEY = 'spouse_house_encryption_key'

export function storeKeyInSession(keyBase64: string): void {
  sessionStorage.setItem(KEY_STORAGE_KEY, keyBase64)
}

export function getKeyFromSession(): string | null {
  return sessionStorage.getItem(KEY_STORAGE_KEY)
}

export function clearKeyFromSession(): void {
  sessionStorage.removeItem(KEY_STORAGE_KEY)
}

// Check if WebAuthn is supported
export function isWebAuthnSupported(): boolean {
  return !!(
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function'
  )
}

// Check if platform authenticator (Face ID, Touch ID) is available
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}
