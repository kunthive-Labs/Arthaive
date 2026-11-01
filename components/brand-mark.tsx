import Image from "next/image"

// The adjacent wordmark provides the accessible name for each home link.
export function BrandMark() {
  return (
    <Image
      src="/android-chrome-192x192.png"
      alt=""
      width={48}
      height={48}
      className="h-12 w-12 shrink-0 bg-white object-contain"
      unoptimized
    />
  )
}
