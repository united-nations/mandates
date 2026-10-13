import { ExplainerText } from '@/components/ExplainerText'
import { SecretariatNavigation } from '@/components/SecretariatNavigation'
import { explainerTexts } from '@/lib/en_text_contents'

export default function SecretariatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-8 pb-6 md:px-12 lg:px-16">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
          {explainerTexts.mainHeader.headline}
        </h1>
        <ExplainerText />
      </section>
      <SecretariatNavigation />
      {children}
    </>
  )
}
