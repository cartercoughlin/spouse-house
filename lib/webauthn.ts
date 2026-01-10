/**
 * WebAuthn library for biometric authentication
 * Supports Face ID, Touch ID, and other platform authenticators
 */

// Helper: Convert ArrayBuffer to base64url
export function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Helper: Convert Uint8Array to base64url
function uint8ArrayToBase64url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Helper: Convert base64url to Uint8Array
export function base64urlToUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - (base64.length % 4)) % 4
  const padded = base64 + '='.repeat(padLen)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes as Uint8Array<ArrayBuffer>
}

export interface WebAuthnRegistrationOptions {
  userId: string
  userEmail: string
  userName?: string
}

export interface StoredCredential {
  credentialId: string
  publicKey: string
  counter: number
  deviceType: string
  backedUp: boolean
  transports: string[]
}

// Generate a random challenge
function generateChallenge(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(32)) as Uint8Array<ArrayBuffer>
}

// Register a new WebAuthn credential (passkey)
export async function registerCredential(
  options: WebAuthnRegistrationOptions
): Promise<StoredCredential> {
  const challenge = generateChallenge()

  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'Spouse House',
      id: window.location.hostname,
    },
    user: {
      id: new TextEncoder().encode(options.userId) as Uint8Array<ArrayBuffer>,
      name: options.userEmail,
      displayName: options.userName || options.userEmail,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' }, // ES256 (preferred for platform authenticators)
      { alg: -257, type: 'public-key' }, // RS256 (fallback)
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Face ID, Touch ID, Windows Hello
      userVerification: 'required', // Always require biometric/PIN
      residentKey: 'required', // Discoverable credential
    },
    timeout: 60000,
    attestation: 'none', // Don't need attestation for our use case
  }

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyOptions,
  })) as PublicKeyCredential

  if (!credential) {
    throw new Error('Failed to create credential')
  }

  const response = credential.response as AuthenticatorAttestationResponse

  // Extract the public key from the attestation response
  const publicKeyBuffer = response.getPublicKey()
  if (!publicKeyBuffer) {
    throw new Error('Failed to get public key')
  }

  // Get transport information if available
  const transports = response.getTransports ? response.getTransports() : []

  return {
    credentialId: arrayBufferToBase64url(credential.rawId),
    publicKey: arrayBufferToBase64url(publicKeyBuffer),
    counter: 0,
    deviceType: credential.authenticatorAttachment || 'platform',
    backedUp: false,
    transports,
  }
}

export interface AuthenticationResult {
  credentialId: string
  signature: string
  authenticatorData: string
  clientDataJSON: string
  counter: number
}

// Authenticate using a stored credential
export async function authenticateWithCredential(
  allowedCredentialIds?: string[]
): Promise<AuthenticationResult> {
  const challenge = generateChallenge()

  const allowCredentials: PublicKeyCredentialDescriptor[] | undefined = allowedCredentialIds?.map((id) => ({
    id: base64urlToUint8Array(id),
    type: 'public-key' as const,
    transports: ['internal'] as AuthenticatorTransport[],
  }))

  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId: window.location.hostname,
    userVerification: 'required',
    timeout: 60000,
    allowCredentials,
  }

  const credential = (await navigator.credentials.get({
    publicKey: publicKeyOptions,
  })) as PublicKeyCredential

  if (!credential) {
    throw new Error('Authentication failed')
  }

  const response = credential.response as AuthenticatorAssertionResponse

  // Extract authenticator data to get the counter
  const authenticatorDataView = new DataView(response.authenticatorData)
  // Counter is at bytes 33-36 (after rpIdHash and flags)
  const counter = authenticatorDataView.getUint32(33, false)

  return {
    credentialId: arrayBufferToBase64url(credential.rawId),
    signature: arrayBufferToBase64url(response.signature),
    authenticatorData: arrayBufferToBase64url(response.authenticatorData),
    clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
    counter,
  }
}

// Check if the platform supports conditional UI (autofill passkeys)
export async function isConditionalUISupported(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false

  try {
    return await PublicKeyCredential.isConditionalMediationAvailable?.() ?? false
  } catch {
    return false
  }
}

// Get friendly name for the authenticator type
export function getAuthenticatorDisplayName(): string {
  const ua = navigator.userAgent.toLowerCase()

  if (ua.includes('iphone') || ua.includes('ipad')) {
    return 'Face ID or Touch ID'
  }
  if (ua.includes('mac')) {
    return 'Touch ID'
  }
  if (ua.includes('android')) {
    return 'Fingerprint or Face Unlock'
  }
  if (ua.includes('windows')) {
    return 'Windows Hello'
  }
  return 'Biometric Authentication'
}
