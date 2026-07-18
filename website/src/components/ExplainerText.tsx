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
        mandates and programmes.
        <br />
        It compiles the source documents that UN entities cite when explaining
        why their programmes exist and why they require resources, enabling
        better dialogue on{' '}
        <Link
          href={explainerTexts.mainHeader.mandateImplementationLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-un-blue transition-colors hover:text-shuttle-gray"
        >
          mandate implementation
        </Link>
        .
      </p>
    </div>
  )
}
