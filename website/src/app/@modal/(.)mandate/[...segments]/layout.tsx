import { MandateDetailSheet } from '@/components/MandateDetailSheet'

export default function ModalMandateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MandateDetailSheet title="Mandate Document">
      {children}
    </MandateDetailSheet>
  )
}
