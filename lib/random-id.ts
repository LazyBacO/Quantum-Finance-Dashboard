const DEFAULT_SYNC_KEY_LENGTH = 32

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function getSecureRandomBytes(size: number) {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function") {
    return globalThis.crypto.getRandomValues(new Uint8Array(size))
  }

  return null
}

function fallbackPseudoRandomHex(length: number) {
  let output = ""
  while (output.length < length) {
    output += Math.random().toString(16).slice(2)
  }
  return output.slice(0, length)
}

export function createSecureHex(length: number) {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("createSecureHex length must be a positive integer")
  }

  const byteLength = Math.ceil(length / 2)
  const secureBytes = getSecureRandomBytes(byteLength)
  if (!secureBytes) {
    return fallbackPseudoRandomHex(length)
  }

  return bytesToHex(secureBytes).slice(0, length)
}

export function createUuidLike() {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }

  const bytes = getSecureRandomBytes(16)
  if (bytes) {
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = bytesToHex(bytes)
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  return `${createSecureHex(8)}-${createSecureHex(4)}-${createSecureHex(4)}-${createSecureHex(4)}-${createSecureHex(12)}`
}

export function createPrefixedId(prefix: string) {
  return `${prefix}-${createUuidLike()}`
}

export function createSyncKey(length = DEFAULT_SYNC_KEY_LENGTH) {
  return createSecureHex(length)
}
