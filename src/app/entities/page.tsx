'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Building, Search, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { EntityName } from '@/components/ui/entity-name';
import { TooltipProvider } from '@/components/ui/tooltip';

interface EntityWithCount {
  name: string;
  count: number;
}

function EntitiesListContent() {
  const [entities, setEntities] = useState<EntityWithCount[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<EntityWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchEntities() {
      try {
        const response = await fetch('/api/mandates/meta');
        const data = await response.json();
        const entitiesData = (data.uniqueEntities || []).sort((a: EntityWithCount, b: EntityWithCount) => 
          a.name.localeCompare(b.name)
        );
        setEntities(entitiesData);
        setFilteredEntities(entitiesData);
      } catch (error) {
        console.error('Failed to fetch entities:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchEntities();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEntities(entities);
    } else {
      const filtered = entities.filter(entity =>
        entity.name.toLowerCase().includes(searchTerm.toLowerCase())
      ).sort((a, b) => a.name.localeCompare(b.name));
      setFilteredEntities(filtered);
    }
  }, [searchTerm, entities]);

  const LoadingSkeleton = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(9)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <main className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto py-6 space-y-6 px-8 sm:px-12 lg:px-16">
          
          {/* Header */}
          <section className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2">
                  <Link href="/">
                    <Button variant="outline" size="sm" className="mb-4">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Main View
                    </Button>
                  </Link>
                </div>
                
                <div className="mb-6 mt-2">
                  <div className="flex items-center gap-3 mb-2">
                    <Building className="h-8 w-8 text-un-blue" />
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">
                      All UN Entities
                    </h1>
                  </div>
                </div>
                
                <div className="text-muted-foreground mt-2 sm:text-justify">
                  <p className="leading-tight mb-3">
                    Browse all UN entities that are cited in mandate documents. Click on any entity to explore 
                    its specific mandates and cross-citations.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Search */}
          <section>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </section>

          {/* Summary */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Entity Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Entities:</span>{' '}
                    <span className="text-muted-foreground">{entities.length}</span>
                  </div>
                  <div>
                    <span className="font-medium">Filtered Results:</span>{' '}
                    <span className="text-muted-foreground">{filteredEntities.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Entities Grid */}
          <section>
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredEntities.map((entity) => (
                  <Card key={entity.name} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/entity/${encodeURIComponent(entity.name)}`}
                            className="block hover:underline"
                          >
                            <div className="font-medium text-sm mb-1">
                              {entity.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <EntityName entityName={entity.name} showUnderline={false} />
                            </div>
                          </Link>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {entity.count}
                          </Badge>
                          <Link href={`/entity/${encodeURIComponent(entity.name)}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoading && filteredEntities.length === 0 && (
              <div className="text-center py-12">
                <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No entities found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default function EntitiesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EntitiesListContent />
    </Suspense>
  );
} 