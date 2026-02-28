import { ConvexHttpClient } from "convex/browser"

/**
 * Single place to initialize Convex client for server/background usage.
 * Keep secrets out of browser code.
 */
export function createConvexHttpClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL")
  }

  const client = new ConvexHttpClient(url)

  // Optional: for privileged server-side calls only.
  const adminKey = process.env.CONVEX_DEPLOY_KEY
  if (adminKey) {
    client.setAuth(adminKey)
  }

  return client
}
