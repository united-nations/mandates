import type { Mandate } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from './ui/separator';
import { BookOpenText, ExternalLink } from 'lucide-react';

interface OperativeParagraphsDialogProps {
  mandate: Mandate | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OperativeParagraphsDialog({ mandate, isOpen, onClose }: OperativeParagraphsDialogProps) {
  if (!mandate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            <BookOpenText size={28} className="mr-3" />
            Operative Paragraphs: {mandate.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            UN Entity: {mandate.unEntity} | Year: {mandate.year}
            {mandate.documentUrl && (
              <a 
                href={mandate.documentUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="ml-4 text-primary hover:underline flex items-center"
              >
                View Full Document <ExternalLink size={14} className="ml-1" />
              </a>
            )}
          </DialogDescription>
        </DialogHeader>
        <Separator className="my-4" />
        <ScrollArea className="flex-grow pr-6">
          {mandate.operativeParagraphs && mandate.operativeParagraphs.length > 0 ? (
            <ul className="space-y-3 list-disc list-inside pl-2">
              {mandate.operativeParagraphs.map((paragraph, index) => (
                <li key={index} className="text-foreground leading-relaxed">
                  {paragraph}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No operative paragraphs available for this mandate.</p>
          )}
        </ScrollArea>
        <DialogFooter className="pt-4">
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
