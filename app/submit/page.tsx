import type { Metadata } from "next"
import { SectionHeader } from "@/components/section-header"
import { SubmitForm } from "./submit-form"

export const metadata: Metadata = { title: "Submit a Deal | Arthaive" }

export default function SubmitPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <SectionHeader
        title="Submit a Deal"
        subtitle="Help us track Indian startup funding. All submissions are reviewed."
      />
      <SubmitForm />
    </main>
  )
}
