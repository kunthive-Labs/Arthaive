"use client"
import { cn } from "@/lib/utils"

interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "success" | "warning" | "danger" | "info"
  size?: "sm" | "md"
  className?: string
}

const VARIANTS = {
  default: "bg-gray-100 text-gray-800 border-gray-300",
  success: "bg-green-100 text-green-800 border-green-300",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
  danger: "bg-red-100 text-red-800 border-red-300",
  info: "bg-blue-100 text-blue-800 border-blue-300",
}

export function Badge({ children, variant = "default", size = "sm", className }: BadgeProps) {
  return (
    <span className={cn(
      "inline-block border font-semibold",
      size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
      VARIANTS[variant],
      className
    )}>
      {children}
    </span>
  )
}
