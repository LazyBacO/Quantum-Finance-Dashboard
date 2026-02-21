export type AccessValidateResponse = {
  ok: boolean
  keyId?: string
  type?: "one_time" | "temporary" | "permanent"
  expiresAt?: string | null
  error?: string
}

export async function validateAccessKeyWithService(rawKey: string): Promise<AccessValidateResponse> {
  const baseUrl = process.env.ACCESS_CONTROL_URL
  const clientSecret = process.env.ACCESS_CONTROL_CLIENT_SECRET || ""

  if (!baseUrl) {
    return { ok: false, error: "missing_access_service_url" }
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/validate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-access-client-secret": clientSecret,
    },
    body: JSON.stringify({ key: rawKey }),
    cache: "no-store",
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    return { ok: false, error: payload.error || "validation_failed" }
  }

  const payload = (await response.json()) as AccessValidateResponse
  return payload
}
