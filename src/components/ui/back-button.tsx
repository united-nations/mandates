'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
}

export function BackButton({ to = '/', label = 'Back to Main View', className = '' }: BackButtonProps) {
  const router = useRouter();
  
  const handleClick = () => {
    // Always navigate to clean URL without any query parameters
    const cleanUrl = to.split('?')[0];
    router.push(cleanUrl);
  };
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className={`mb-4 shrink-0 inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1 sm:px-2.5 sm:py-1.5 h-auto !bg-trout !text-white hover:!bg-trout/90 transition-colors ${className}`}
      onClick={handleClick}
    >
      <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
      {label}
    </Button>
  );
} 