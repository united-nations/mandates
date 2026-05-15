import Link from 'next/link'
import { explainerTexts } from '@/lib/en_text_contents'

export function ExplainerText() {
  return (
    <div className="mt-4 max-w-full text-left text-muted-foreground sm:max-w-[calc(75%-var(--spacing))] sm:text-justify">
      <p className="mb-0 leading-tight">
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
        mandates and programmes. It compiles the source documents that UN
        entities cite when explaining why their programmes exist and why they
        require resources, enabling better dialogue on{' '}
        <Link
          href={explainerTexts.mainHeader.mandateImplementationLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-un-blue transition-colors hover:text-shuttle-gray"
        >
          mandate implementation
        </Link>
        .
        <br />
        <Link
          href="/methodology"
          className="mt-1 inline-block font-bold text-un-blue no-underline transition-colors hover:text-shuttle-gray"
        >
          Learn More
        </Link>
      </p>
    </div>
  )
}
