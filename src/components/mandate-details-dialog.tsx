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
import { Badge } from './ui/badge';
import { BookOpenText, ExternalLink, Building2, Calendar, Hash, FileText, Users, Tag } from 'lucide-react';

interface MandateDetailsDialogProps {
  mandate: Mandate | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MandateDetailsDialog({ mandate, isOpen, onClose }: MandateDetailsDialogProps) {
  if (!mandate) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not available';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] md:max-w-[900px] lg:max-w-[1100px] max-h-[90vh] flex flex-col bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary flex items-center">
            <BookOpenText size={24} className="mr-3" />
            {mandate.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1 space-y-1">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1">
                <Hash size={14} />
                {mandate.documentSymbol}
              </span>
              <span className="flex items-center gap-1">
                <Building2 size={14} />
                {mandate.entity} - {mandate.entityLong}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {formatDate(mandate.publicationDate || mandate.printingDate)}
              </span>
              {mandate.linkId && (
                <a 
                  href={mandate.linkId} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={14} />
                  View Document
                </a>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <Separator className="my-4" />
        
        <ScrollArea className="flex-grow pr-6">
          <div className="space-y-6">
            
            {/* Document Information */}
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText size={18} />
                Document Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Document Symbol:</span>
                  <p className="font-mono">{mandate.fullDocumentSymbol}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Part in Document:</span>
                  <p>{mandate.partInDocument}</p>
                </div>
                {mandate.subtitle && (
                  <div>
                    <span className="font-medium text-muted-foreground">Subtitle:</span>
                    <p>{mandate.subtitle}</p>
                  </div>
                )}
                {mandate.statementOfResponsibility && (
                  <div>
                    <span className="font-medium text-muted-foreground">Responsibility:</span>
                    <p>{mandate.statementOfResponsibility}</p>
                  </div>
                )}
                {mandate.pagination && (
                  <div>
                    <span className="font-medium text-muted-foreground">Pagination:</span>
                    <p>{mandate.pagination}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Abstract/Summary */}
            {mandate.abstract && (
              <section>
                <h3 className="text-lg font-semibold mb-3">Abstract</h3>
                <p className="text-foreground leading-relaxed bg-muted/30 p-4 rounded-lg">
                  {mandate.abstract}
                </p>
              </section>
            )}

            {/* Subject Headings */}
            {mandate.subjectHeadings.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Tag size={18} />
                  Subject Headings
                </h3>
                <div className="flex flex-wrap gap-2">
                  {mandate.subjectHeadings.map((heading, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {heading}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Authors/Meetings */}
            {mandate.author.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users size={18} />
                  Authors/Meeting Bodies
                </h3>
                <ul className="space-y-1">
                  {mandate.author.map((author, index) => (
                    <li key={index} className="text-sm bg-muted/20 p-2 rounded">
                      {author}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Collection Information */}
            {(mandate.collectionLevel1 || mandate.collectionLevel2 || mandate.collectionLevel3) && (
              <section>
                <h3 className="text-lg font-semibold mb-3">Collection Classification</h3>
                <div className="space-y-2 text-sm">
                  {mandate.collectionLevel1 && (
                    <div>
                      <span className="font-medium text-muted-foreground">Level 1:</span>
                      <span className="ml-2">{mandate.collectionLevel1}</span>
                    </div>
                  )}
                  {mandate.collectionLevel2 && (
                    <div>
                      <span className="font-medium text-muted-foreground">Level 2:</span>
                      <span className="ml-2">{mandate.collectionLevel2}</span>
                    </div>
                  )}
                  {mandate.collectionLevel3 && (
                    <div>
                      <span className="font-medium text-muted-foreground">Level 3:</span>
                      <span className="ml-2">{mandate.collectionLevel3}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Agenda Information */}
            {(mandate.agendaItemTitle || mandate.agendaItemNumber) && (
              <section>
                <h3 className="text-lg font-semibold mb-3">Agenda Information</h3>
                <div className="space-y-2 text-sm">
                  {mandate.agendaItemNumber && (
                    <div>
                      <span className="font-medium text-muted-foreground">Item Number:</span>
                      <span className="ml-2">{mandate.agendaItemNumber}</span>
                    </div>
                  )}
                  {mandate.agendaItemTitle && (
                    <div>
                      <span className="font-medium text-muted-foreground">Item Title:</span>
                      <span className="ml-2">{mandate.agendaItemTitle}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Related Documents */}
            {mandate.relatedDocuments.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-3">Related Documents</h3>
                <div className="flex flex-wrap gap-2">
                  {mandate.relatedDocuments.map((doc, index) => (
                    <Badge key={index} variant="secondary" className="text-xs font-mono">
                      {doc}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Vote Summary */}
            {mandate.voteSummary && (
              <section>
                <h3 className="text-lg font-semibold mb-3">Vote Summary</h3>
                <p className="text-sm bg-muted/20 p-3 rounded-lg">
                  {mandate.voteSummary}
                </p>
              </section>
            )}

            {/* Notes */}
            {mandate.note && (
              <section>
                <h3 className="text-lg font-semibold mb-3">Notes</h3>
                <p className="text-sm bg-muted/20 p-3 rounded-lg">
                  {mandate.note}
                </p>
              </section>
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter className="pt-4 mt-auto">
          <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 