"use client"
import { useClipboard } from "@/hooks/use-clipboard"
import { SHARE_PLATFORMS } from "@/lib/constants"

interface ShareButtonProps { url: string; title: string }

export function ShareButton({ url, title }: ShareButtonProps) {
  const { copied, copy } = useClipboard()
  return (
    <div className="relative group inline-block">
      <button className="px-3 py-1.5 text-sm font-bold border-2 border-black hover:bg-black hover:text-white transition-colors">
        {copied ? "Copied!" : "Share"}
      </button>
      <div className="absolute right-0 top-full mt-1 bg-white border-2 border-black hidden group-hover:block z-10 min-w-[120px]">
        {SHARE_PLATFORMS.map(p => (
          <button
            key={p.value}
            onClick={() => p.value === "copy" ? copy(url) : window.open(`https://${p.value}.com/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, "_blank")}
            className="block w-full text-left px-3 py-2 text-sm font-semibold hover:bg-gray-100"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
