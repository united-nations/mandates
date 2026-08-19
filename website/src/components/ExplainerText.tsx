import Link from 'next/link'
import { explainerTexts } from '@/lib/en_text_contents'

export function ExplainerText() {
  return (
    <div className="max-w-3xl text-left text-foreground">
      <p className="mb-0 text-base leading-relaxed md:text-lg">
        Developed as part of the{' '}
        <Link
          href={explainerTexts.mainHeader.un80Link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-un-blue transition-colors hover:text-shuttle-gray"
        >
          UN80 Initiative
        </Link>
        , this registry serves as a transparency tool for understanding UN
        mandates and programmes.{' '}
        {/* A secondary pointer, not a call to action, so it rides the end of
            the sentence at body size rather than standing on its own line.
            It carries its own accent colour: inline, nothing else supplies
            one. The hover treatment differs from the UN80 link above — that
            is the two links as they were written, not a normalisation
            anyone has ruled on. */}
        <Link href="/methodology" className="text-un-blue hover:underline">
          See the methodology
        </Link>
        .
      </p>
    </div>
  )
}
