import type { Mandate } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpenText, CalendarDays, Landmark } from 'lucide-react';

interface MandateListItemProps {
  mandate: Mandate;
  onViewOperativeParagraphs: (mandateId: string) => void;
}

export function MandateListItem({ mandate, onViewOperativeParagraphs }: MandateListItemProps) {
  return (
    <Card className="mb-4 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-primary">{mandate.title}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground pt-1 flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Landmark size={16} /> {mandate.unEntity}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays size={16} /> {mandate.year}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-foreground mb-3">{mandate.summary}</p>
        {mandate.keywords && mandate.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {mandate.keywords.map((keyword) => (
              <Badge key={keyword} variant="secondary" className="text-xs">
                {keyword}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          onClick={() => onViewOperativeParagraphs(mandate.id)}
          variant="default"
          aria-label={`View operative paragraphs for ${mandate.title}`}
        >
          <BookOpenText size={18} className="mr-2" />
          View Operative Paragraphs
        </Button>
      </CardFooter>
    </Card>
  );
}
