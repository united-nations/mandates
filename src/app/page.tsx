'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Mandate } from '@/types';
import { mockMandates, uniqueEntities, uniqueYears } from '@/data/mock-mandates';
import { MandateListItem } from '@/components/mandate-list-item';
import { FilterControls } from '@/components/filter-controls';
import { OperativeParagraphsDialog } from '@/components/operative-paragraphs-dialog';
import { BarChart, ListChecks } from 'lucide-react'; // Using ListChecks instead of a generic list icon

export default function MandateNavigatorPage() {
  const [allMandates] = useState<Mandate[]>(mockMandates);
  const [filteredMandates, setFilteredMandates] = useState<Mandate[]>(allMandates);

  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [keyword, setKeyword] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeMandate, setActiveMandate] = useState<Mandate | null>(null);

  useEffect(() => {
    let mandates = allMandates;

    if (selectedEntity) {
      mandates = mandates.filter((m) => m.unEntity === selectedEntity);
    }

    if (selectedYear) {
      mandates = mandates.filter((m) => m.year === parseInt(selectedYear, 10));
    }

    if (keyword.trim() !== '') {
      const lowerKeyword = keyword.toLowerCase();
      mandates = mandates.filter(
        (m) =>
          m.title.toLowerCase().includes(lowerKeyword) ||
          m.summary.toLowerCase().includes(lowerKeyword) ||
          (m.keywords && m.keywords.some(k => k.toLowerCase().includes(lowerKeyword)))
      );
    }

    setFilteredMandates(mandates);
  }, [selectedEntity, selectedYear, keyword, allMandates]);

  const handleViewOperativeParagraphs = (mandateId: string) => {
    const mandate = allMandates.find(m => m.id === mandateId);
    if (mandate) {
      setActiveMandate(mandate);
      setIsDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setActiveMandate(null);
  };
  
  const handleClearFilters = () => {
    setSelectedEntity('');
    setSelectedYear('');
    setKeyword('');
  };

  const entityOptions = useMemo(() => uniqueEntities, []);
  const yearOptions = useMemo(() => uniqueYears, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-8 px-4 md:px-8 bg-primary shadow-md">
        <div className="container mx-auto">
          <h1 className="text-4xl md:text-5xl font-headline text-primary-foreground text-center">
            Mandate Navigator
          </h1>
          <p className="text-center text-lg text-primary-foreground/90 mt-2 font-body">
            Explore UN Entities and the mandate documents they cite.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-8">
        <FilterControls
          entities={entityOptions}
          years={yearOptions}
          selectedEntity={selectedEntity}
          selectedYear={selectedYear}
          keyword={keyword}
          onEntityChange={setSelectedEntity}
          onYearChange={setSelectedYear}
          onKeywordChange={setKeyword}
          onClearFilters={handleClearFilters}
        />

        {filteredMandates.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {filteredMandates.map((mandate) => (
              <MandateListItem
                key={mandate.id}
                mandate={mandate}
                onViewOperativeParagraphs={handleViewOperativeParagraphs}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ListChecks size={64} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground font-body">No mandates found matching your criteria.</p>
            <p className="text-sm text-muted-foreground/80 font-body mt-2">Try adjusting your filters or clearing them to see all mandates.</p>
          </div>
        )}
      </main>

      <OperativeParagraphsDialog
        mandate={activeMandate}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
      />

      <footer className="py-8 mt-12 border-t border-border bg-card text-center">
        <p className="text-sm text-muted-foreground font-body">
          &copy; {new Date().getFullYear()} Mandate Navigator. For informational purposes only.
        </p>
      </footer>
    </div>
  );
}
