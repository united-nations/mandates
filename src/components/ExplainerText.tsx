import Link from "next/link";
import { explainerTexts } from "@/lib/explainer-texts";

export function ExplainerText() {
  return (
    <div className="text-muted-foreground mt-4 sm:text-justify max-w-[792px] text-left">
      <p className="leading-tight mb-0">
        Developed as part of the{" "}
        <Link
          href={explainerTexts.mainHeader.un80Link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-un-blue hover:text-shuttle-gray transition-colors"
        >
          UN80 Initiative
        </Link>
        , this registry serves as a transparency tool for understanding UN
        mandates and programmes. It compiles the source documents that UN
        entities cite when explaining why their programmes exist and why they
        require resources, enabling better dialogue on{" "}
        <Link
          href={explainerTexts.mainHeader.mandateImplementationLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-un-blue hover:text-shuttle-gray transition-colors"
        >
          mandate implementation
        </Link>
        . <br />
        <Link
          href="/methodology"
          className="font-bold text-un-blue hover:text-shuttle-gray text-sm inline transition-colors underline"
        >
          Learn More
        </Link>
      </p>
    </div>
  );
}
