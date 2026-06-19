import Link from "next/link"

export function ViewDataLink({ href }: { href?: string }) {
  if (!href) return null
  return (
    <Link
      href={href}
      className="inline-block mt-2 text-xs font-semibold text-green-700 hover:underline"
    >
      View data →
    </Link>
  )
}
