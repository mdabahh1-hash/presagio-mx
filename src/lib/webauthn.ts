// WebAuthn (passkeys) via raw navigator.credentials — no library, keeping the
// dependency-light setup. Handles the base64url <-> ArrayBuffer plumbing the
// browser API requires.
import { authApi, setToken } from './api'

function b64urlToBuf(s: string): ArrayBuffer {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

function bufToB64url(b: ArrayBuffer): string {
  const bytes = new Uint8Array(b)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function supportsPasskeys(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential
}

export function isPasskeyCancel(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'NotAllowedError'
}

// Register a new passkey for the CURRENT logged-in user (called from Profile).
export async function registerPasskey(): Promise<void> {
  if (!supportsPasskeys()) throw new Error('Tu navegador no soporta passkeys')
  const { state, options } = await authApi.passkeyRegisterOptions()

  const publicKey: PublicKeyCredentialCreationOptions = {
    ...options,
    challenge: b64urlToBuf(options.challenge),
    user: { ...options.user, id: b64urlToBuf(options.user.id) },
    excludeCredentials: (options.excludeCredentials ?? []).map((c: any) => ({
      ...c,
      id: b64urlToBuf(c.id),
    })),
  }

  const cred = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential
  if (!cred) throw new Error('No se pudo crear la passkey')
  const resp = cred.response as AuthenticatorAttestationResponse

  await authApi.passkeyRegisterVerify(state, {
    id: cred.id,
    rawId: bufToB64url(cred.rawId),
    type: cred.type,
    authenticatorAttachment: (cred as any).authenticatorAttachment ?? null,
    clientExtensionResults: cred.getClientExtensionResults(),
    response: {
      clientDataJSON: bufToB64url(resp.clientDataJSON),
      attestationObject: bufToB64url(resp.attestationObject),
      transports: (resp as any).getTransports?.() ?? [],
    },
  })
}

// Log in with a discoverable passkey (no email needed). Stores the token.
export async function loginPasskey(): Promise<void> {
  if (!supportsPasskeys()) throw new Error('Tu navegador no soporta passkeys')
  const { state, options } = await authApi.passkeyLoginOptions()

  const publicKey: PublicKeyCredentialRequestOptions = {
    ...options,
    challenge: b64urlToBuf(options.challenge),
    allowCredentials: (options.allowCredentials ?? []).map((c: any) => ({
      ...c,
      id: b64urlToBuf(c.id),
    })),
  }

  const cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential
  if (!cred) throw new Error('No se pudo verificar la passkey')
  const resp = cred.response as AuthenticatorAssertionResponse

  const result = await authApi.passkeyLoginVerify(state, {
    id: cred.id,
    rawId: bufToB64url(cred.rawId),
    type: cred.type,
    authenticatorAttachment: (cred as any).authenticatorAttachment ?? null,
    clientExtensionResults: cred.getClientExtensionResults(),
    response: {
      clientDataJSON: bufToB64url(resp.clientDataJSON),
      authenticatorData: bufToB64url(resp.authenticatorData),
      signature: bufToB64url(resp.signature),
      userHandle: resp.userHandle ? bufToB64url(resp.userHandle) : null,
    },
  })
  setToken(result.token)
}
