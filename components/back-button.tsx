"use client"

import { useRouter } from "next/navigation"

interface BackButtonProps {
  fallback?: string
  label?: string
}

export function BackButton({ fallback = "/", label = "BACK" }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(fallback)
    }
  }

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center gap-2 font-bold text-sm border-2 border-black px-4 py-2 mb-8 hover:bg-black hover:text-white transition-colors"
    >
      ← {label}
    </button>
  )
}
