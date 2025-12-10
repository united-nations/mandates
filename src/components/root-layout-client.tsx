"use client";

import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareButton } from "@/components/share-button";
import { Toaster } from "@/components/ui/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilterProvider } from "@/contexts/FilterContext";
import {
  BookOpen,
  ExternalLink,
  Home,
  Info,
  Menu,
  MessageCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Dynamic import to prevent SSR and eliminate hydration errors
const AnimatedLogo = dynamic(
  () => import("@/components/ui/animated-logo").then((mod) => mod.AnimatedLogo),
  {
    ssr: false,
  },
);

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMainPage = pathname === "/";
  const isResolutionsPage = pathname === "/resolutions";
  const isReportsPage = pathname === "/reports";
  const isDiffPage = pathname === "/diff";

  return (
    <>
      <TooltipProvider>
        <FilterProvider>
          <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 border-b">
            <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-2 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex flex-col lg:flex-row lg:items-center lg:gap-x-2 mb-0">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:gap-x-2">
                    <Link
                      href="/"
                      className="text-4xl tracking-tight text-foreground hover:text-un-blue transition-colors leading-tight mt-1"
                    >
                      <div className="leading-none">
                        <span className="font-bold">UN Mandate</span>
                        <span className="text-3xl font-normal block lg:inline lg:ml-1 lg:pl-1 lg:text-4xl">
                          Source Registry
                        </span>
                      </div>
                    </Link>
                    {/*  beta badge that repositions */}
                    <div className="hidden lg:block mt-1 self-start lg:self-auto">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer h-auto"
                          >
                            beta version
                            <Info className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-56">
                          <p className="text-sm">
                            This beta version focuses on data about the UN
                            secretariat.
                            <br />
                            Go to the{" "}
                            <Link
                              href="/methodology"
                              className="text-un-blue hover:text-shuttle-gray underline font-medium"
                            >
                              Methodology
                            </Link>{" "}
                            page for more details.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <ShareButton />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Open navigation menu"
                      className="shrink-0 inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1 sm:px-2.5 sm:py-1.5 h-auto bg-trout! text-white! hover:bg-trout/90!"
                    >
                      <Menu className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      asChild={pathname !== "/"}
                      className={
                        pathname === "/"
                          ? "text-muted-foreground cursor-default opacity-60"
                          : ""
                      }
                    >
                      {pathname === "/" ? (
                        <span className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          Mandate Source Registry
                        </span>
                      ) : (
                        <Link href="/" className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          Mandate Source Registry
                        </Link>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild={pathname !== "/methodology"}
                      className={
                        pathname === "/methodology"
                          ? "text-muted-foreground cursor-default opacity-60"
                          : ""
                      }
                    >
                      {pathname === "/methodology" ? (
                        <span className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Methodology
                        </span>
                      ) : (
                        <Link
                          href="/methodology"
                          className="flex items-center gap-2"
                        >
                          <BookOpen className="h-4 w-4" />
                          Methodology
                        </Link>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild={pathname !== "/resources"}
                      className={
                        pathname === "/resources"
                          ? "text-muted-foreground cursor-default opacity-60"
                          : ""
                      }
                    >
                      {pathname === "/resources" ? (
                        <span className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          More Resources
                        </span>
                      ) : (
                        <Link
                          href="/resources"
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          More Resources
                        </Link>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Back Button - shown on all pages except main page, resolutions page, reports page, and diff page */}
          {!isMainPage &&
            !isResolutionsPage &&
            !isReportsPage &&
            !isDiffPage && (
              <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 pt-6 mb-2">
                <BackButton />
              </div>
            )}

          <main className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto py-6 px-8 sm:px-12 lg:px-16">
            {children}
          </main>

          {/* Fixed Feedback Button */}
          <Button
            asChild
            className="fixed bottom-6 right-6 z-50 shadow-lg hover:shadow-xl transition-shadow"
            size="default"
          >
            <a
              href="https://airtable.com/appId4rDWaFTpzNWz/pagpU0nMIhQMQPICL/form"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Give Feedback
            </a>
          </Button>

          {/* UN80 Logo with UN20 Animation - fixed at bottom */}
          <AnimatedLogo />

          <Toaster />
        </FilterProvider>
      </TooltipProvider>
    </>
  );
}
