const encoder = new TextEncoder()

function toBase64Url(input: Uint8Array | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input)
  return buf.toString("base64url")
}

function fromBase64Url(base64url: string): string {
  return Buffer.from(base64url, "base64url").toString("utf8")
}

async function hmac(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message))
  return toBase64Url(new Uint8Array(sig))
}

export type AccessSessionPayload = {
  keyId: string
  type: "one_time" | "temporary" | "permanent"
  iat: number
  exp: number
}

export async function signSession(payload: AccessSessionPayload, secret: string): Promise<string> {
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = await hmac(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

export async function verifySession(token: string, secret: string): Promise<AccessSessionPayload | null> {
  const [payloadB64, signature] = token.split(".")
  if (!payloadB64 || !signature) return null

  const expected = await hmac(payloadB64, secret)
  if (signature !== expected) return null

  const payload = JSON.parse(fromBase64Url(payloadB64)) as AccessSessionPayload
  if (!payload.exp || Date.now() >= payload.exp) return null
  return payload
}
