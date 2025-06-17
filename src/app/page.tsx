
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Mandate } from '@/types';
import { mockMandates, uniqueEntities, uniqueYears } from '@/data/mock-mandates';
import { FilterControls } from '@/components/filter-controls';
import { OperativeParagraphsDialog } from '@/components/operative-paragraphs-dialog';
import { MandateTable } from '@/components/mandate-table'; // New table component
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, FileText, Users, CalendarDays, ListChecks } from 'lucide-react';

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
          m.programmePlanSection.toLowerCase().includes(lowerKeyword) || // Search in new field
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

  const totalMandatesCount = allMandates.length;
  const uniqueEntitiesCount = uniqueEntities.length;
  
  const mostRecentYear = useMemo(() => {
    if (yearOptions.length > 0) {
      return yearOptions[0]; // uniqueYears is sorted descending
    }
    return new Date().getFullYear(); // Fallback, though should not be needed
  }, [yearOptions]);

  const mandatesInMostRecentYearCount = useMemo(() => {
    if (mostRecentYear) {
      return allMandates.filter(m => m.year === mostRecentYear).length;
    }
    return 0;
  }, [allMandates, mostRecentYear]);


  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-6 px-4 md:px-8 border-b border-border">
        <div className="container mx-auto flex items-center gap-3">
          <Globe className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">
            UN Mandate Explorer
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Data Overview Section */}
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-4">Data Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Mandates</CardTitle>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{totalMandatesCount}</div>
                <p className="text-xs text-muted-foreground">Currently tracked mandates</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unique UN Entities</CardTitle>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{uniqueEntitiesCount}</div>
                <p className="text-xs text-muted-foreground">Entities with mandates</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Mandates in {mostRecentYear}</CardTitle>
                <ListChecks className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{mandatesInMostRecentYearCount}</div>
                <p className="text-xs text-muted-foreground">In the most recent year</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Filter Mandates Section */}
        <section>
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
        </section>

        {/* Mandate List Section */}
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-4">Mandate List</h2>
          <MandateTable
            mandates={filteredMandates}
            onViewOperativeParagraphs={handleViewOperativeParagraphs}
          />
        </section>
      </main>

      <OperativeParagraphsDialog
        mandate={activeMandate}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
      />
      
      {/* Footer removed as per screenshot */}
    </div>
  );
}
