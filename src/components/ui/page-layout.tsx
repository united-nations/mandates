import { ReactNode } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';

interface PageLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
  backButtonProps?: {
    to?: string;
    label?: string;
  };
}

export function PageLayout({ children, showBackButton = false, backButtonProps }: PageLayoutProps) {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <main className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto py-10 px-8 sm:px-12 lg:px-16">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
} 