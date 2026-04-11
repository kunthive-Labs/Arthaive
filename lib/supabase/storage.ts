import { createClient } from "./server"

const BUCKET = "avatars"

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = await createClient()
  const ext = file.name.split(".").pop()
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}


export async function getAvatarUrl(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const extensions = ["jpg", "png", "webp"]
  for (const ext of extensions) {
    const { data } = supabase.storage.from("avatars").getPublicUrl(`${userId}/avatar.${ext}`)
    if (data?.publicUrl) return data.publicUrl
  }
  return null
}
