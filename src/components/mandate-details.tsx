'use client';

import { useState } from 'react';
import type { Mandate } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface MandateDetailsProps {
  mandate: Mandate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MandateDetails({ mandate, open, onOpenChange }: MandateDetailsProps) {
  const [isPdfVisible, setIsPdfVisible] = useState(false);

  if (!mandate) {
    return null;
  }
  
  const displaySymbol = mandate.full_document_symbol || mandate.symbol;
  const pdfUrl = mandate.full_document_symbol
    ? `https://documents.un.org/api/symbol/access?s=${mandate.full_document_symbol}&l=en&t=pdf`
    : null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
            setIsPdfVisible(false);
        }
    }}>
      <SheetContent className="w-full sm:max-w-3xl p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-2xl font-bold">{mandate.title || 'Mandate Details'}</SheetTitle>
              <SheetDescription>
                {displaySymbol}
              </SheetDescription>
            </SheetHeader>
            
            {pdfUrl && (
              <Accordion type="single" collapsible onValueChange={(value) => setIsPdfVisible(value === 'pdf-viewer')}>
                  <AccordionItem value="pdf-viewer">
                      <AccordionTrigger>View Document</AccordionTrigger>
                      <AccordionContent>
                          {isPdfVisible ? (
                              <iframe
                                  src={pdfUrl}
                                  className="w-full h-[80vh]"
                                  title={`PDF viewer for ${mandate.full_document_symbol}`}
                              />
                          ) : (
                              <p>Loading PDF...</p>
                          )}
                      </AccordionContent>
                  </AccordionItem>
              </Accordion>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">AI Summary</h3>
                  <p className="text-muted-foreground italic">
                    (AI summary of the mandate will be displayed here. This is a placeholder.)
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.
                  </p>
                </div>

                {mandate.operative_paragraphs && mandate.operative_paragraphs.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Operative Paragraphs</h3>
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      <ul className="list-disc pl-5 space-y-2">
                        {mandate.operative_paragraphs.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Metadata</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Symbol</span>
                      <span>{mandate.symbol}</span>
                    </div>
                    {mandate.body && (
                      <div className="flex justify-between">
                        <span className="font-medium text-muted-foreground">Issuing Body</span>
                        <span>{mandate.body}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Citing Entities ({mandate.entities.length})</h3>
                  <div className="flex flex-wrap gap-1">
                    {mandate.entities.filter(e => e).map(entity => (
                      <Badge key={entity} variant="secondary">{entity}</Badge>
                    ))}
                  </div>
                </div>
                 <div>
                  <h3 className="text-lg font-semibold mb-2">Priority Area</h3>
                  <Badge variant="default">{mandate.priority_area}</Badge>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
} 