import { toNextJsHandler } from "better-auth/next-js"
import { withRequestAuth } from "@/lib/auth"

export async function GET(request: Request) {
  return withRequestAuth((auth) => toNextJsHandler(auth).GET(request))
}

export async function POST(request: Request) {
  return withRequestAuth((auth) => toNextJsHandler(auth).POST(request))
}
