import { AbsenHeader } from './AbsenHeader'

export default function AbsenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <AbsenHeader />
      {children}
    </div>
  )
}
