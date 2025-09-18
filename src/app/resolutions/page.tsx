"use client";

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Resolution } from "@/types";
import { Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, X } from "lucide-react";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { useEffect, useState } from "react";

interface ApiResponse {
    data: Resolution[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export default function ResolutionsPage() {
    const [resolutions, setResolutions] = useState<Resolution[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    const [sortField, setSortField] = useState<keyof Resolution>('year');
    const [sortOrder, setSortOrder] = useState<1 | -1>(-1);
    const [selectedOrgan, setSelectedOrgan] = useState<string>('General Assembly');
    const [selectedRecurringSeries, setSelectedRecurringSeries] = useState<string>('all');
    const [isShowingFilteredSubset, setIsShowingFilteredSubset] = useState(false);

    const organOptions = [
        { value: 'all', label: 'All Organs' },
        { value: 'General Assembly', label: 'General Assembly' },
        { value: 'Economic and Social Council', label: 'Economic and Social Council' },
        { value: 'Security Council', label: 'Security Council' },
        { value: 'Human Rights Council', label: 'Human Rights Council' },
    ];

    const recurringSeriesOptions = [
        { value: 'all', label: 'All Documents' },
        { value: 'true', label: 'Recurring Resolutions' },
        { value: 'false', label: 'One-time Resolutions' },
    ];

    const fetchResolutions = async (page: number = 1, limit: number = 20, sortField: string = 'year', sortOrder: string = 'desc', organ: string = 'General Assembly', recurringSeries: string = 'all') => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                sortField,
                sortOrder,
            });

            if (organ !== 'all') {
                params.append('organ', organ);
            }

            if (recurringSeries !== 'all') {
                params.append('is_recurring_series', recurringSeries);
            }

            const response = await fetch(`/api/resolutions?${params}`);
            if (!response.ok) {
                throw new Error('Failed to fetch resolutions');
            }
            const data: ApiResponse = await response.json();
            setResolutions(data.data);
            setPagination(data.pagination);
            setError(null);
            setIsShowingFilteredSubset(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResolutions(1, 20, 'year', 'desc', selectedOrgan, selectedRecurringSeries);
    }, [selectedOrgan, selectedRecurringSeries]);

    const handleSort = (e: any) => {
        const newSortField = e.sortField as keyof Resolution;
        let newSortOrder: 1 | -1;

        // Custom sort behavior: 
        // - If clicking a new column, start with descending (-1)
        // - If clicking the same column, toggle the order
        if (newSortField !== sortField) {
            // New column - start with descending (high to low)
            newSortOrder = -1;
        } else {
            // Same column - toggle the current order
            newSortOrder = sortOrder === 1 ? -1 : 1;
        }

        setSortField(newSortField);
        setSortOrder(newSortOrder);

        if (isShowingFilteredSubset) {
            // Sort the current filtered subset client-side
            const sortedResolutions = [...resolutions].sort((a, b) => {
                const aValue = a[newSortField];
                const bValue = b[newSortField];

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    const comparison = aValue.localeCompare(bValue);
                    return newSortOrder === 1 ? comparison : -comparison;
                }

                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    const comparison = aValue - bValue;
                    return newSortOrder === 1 ? comparison : -comparison;
                }

                return 0;
            });

            setResolutions(sortedResolutions);
        } else {
            // Normal server-side sorting for full dataset
            fetchResolutions(pagination.page, pagination.limit, newSortField, newSortOrder === 1 ? 'asc' : 'desc', selectedOrgan, selectedRecurringSeries);
        }
    };

    const handlePageChange = (e: any) => {
        const newPage = e.page + 1; // PrimeReact uses 0-based indexing
        fetchResolutions(newPage, e.rows, sortField, sortOrder === 1 ? 'asc' : 'desc', selectedOrgan, selectedRecurringSeries);
    };

    const handleOrganChange = (value: string) => {
        setSelectedOrgan(value);
        setIsShowingFilteredSubset(false);
        // fetchResolutions will be called by useEffect when selectedOrgan changes
    };

    const handleRecurringSeriesChange = (value: string) => {
        setSelectedRecurringSeries(value);
        setIsShowingFilteredSubset(false);
        // fetchResolutions will be called by useEffect when selectedRecurringSeries changes
    };

    const titleTemplate = (row: Resolution) => (
        <div className="truncate max-w-[20rem] sm:max-w-[24rem] md:max-w-[28rem] lg:max-w-[32rem] xl:max-w-[40rem]" title={row.title || row.combined_title}>
            <span className="font-medium">{row.title || row.combined_title}</span>
        </div>
    );

    const symbolTemplate = (row: Resolution) => (
        <div className="font-mono text-sm">
            {row.url ? (
                <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-un-blue hover:text-un-blue/80 hover:underline"
                >
                    {row.symbol}
                </a>
            ) : (
                <span>{row.symbol}</span>
            )}
        </div>
    );

    const yearTemplate = (row: Resolution) => (
        <div>{row.year === 0 ? 'N/A' : row.year}</div>
    );

    const lengthTemplate = (row: Resolution) => {
        if (!row.word_count) {
            return <div><span className="text-gray-400">N/A</span></div>;
        }

        // Round to nearest 50
        const roundedCount = Math.round(row.word_count / 50) * 50;

        return (
            <div>
                ~{roundedCount.toLocaleString()}
            </div>
        );
    };

    const handleSeriesClick = async (normalizedTitle: string, organ: string) => {
        try {
            setLoading(true);

            // Fetch all resolutions to find the series
            const response = await fetch('/api/resolutions?limit=10000'); // Get all to search
            if (!response.ok) {
                throw new Error('Failed to fetch resolutions');
            }
            const data: ApiResponse = await response.json();

            // Find all resolutions in the same series (same normalized_title and organ)
            const seriesResolutions = data.data.filter(res =>
                res.normalized_title === normalizedTitle && res.organ === organ
            );

            if (seriesResolutions.length > 0) {
                // Sort by year to show chronological order (highest year on top)
                const sortedSeries = seriesResolutions.sort((a, b) => b.year - a.year);

                // Show the entire series
                setResolutions(sortedSeries);
                setPagination({
                    page: 1,
                    limit: sortedSeries.length,
                    total: sortedSeries.length,
                    totalPages: 1
                });
                setIsShowingFilteredSubset(true);

                // Set sort state to reflect the current sorting
                setSortField('year');
                setSortOrder(-1); // -1 for descending

                // Brief highlight after loading
                setTimeout(() => {
                    const tableElement = document.querySelector('.p-datatable-tbody');
                    if (tableElement) {
                        const rows = tableElement.querySelectorAll('tr');
                        rows.forEach((row, index) => {
                            setTimeout(() => {
                                const originalBackground = (row as HTMLElement).style.backgroundColor;
                                (row as HTMLElement).style.backgroundColor = '#009edb20';
                                (row as HTMLElement).style.borderLeft = '4px solid #009edb';
                                setTimeout(() => {
                                    (row as HTMLElement).style.backgroundColor = originalBackground;
                                    (row as HTMLElement).style.borderLeft = '';
                                }, 800);
                            }, index * 100); // Stagger the highlighting
                        });
                    }
                }, 100);
            } else {
                setError(`No series found for "${normalizedTitle}" in ${organ}.`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load series');
        } finally {
            setLoading(false);
        }
    };

    const recurrenceTemplate = (row: Resolution) => {
        // Only show tooltip for recurring series (more than 1 resolution)
        if (row.series_symbol_count === 1) {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="text-sm cursor-help">
                            <div className="font-medium">1 total</div>
                            <div className="text-muted-foreground">{row.year === 0 ? 'N/A' : row.year}</div>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Standalone resolution</p>
                        <p className="text-xs text-gray-500 mt-1">
                            Not part of a recurring series
                        </p>
                    </TooltipContent>
                </Tooltip>
            );
        }

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="text-sm cursor-help">
                        <div className="font-medium">{row.series_symbol_count} total</div>
                        <div className="text-muted-foreground">
                            {row.series_first_year === 0 || row.series_last_year === 0 ? 'N/A' :
                                row.series_first_year === row.series_last_year
                                    ? `${row.series_first_year}`
                                    : `${row.series_first_year}-${row.series_last_year}`}
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent className="p-0">
                    <button
                        onClick={() => handleSeriesClick(row.normalized_title, row.organ)}
                        className="px-3 py-2 text-sm hover:bg-gray-100 transition-colors rounded"
                    >
                        View entire series ({row.series_symbol_count} resolutions)
                        <div className="text-xs text-gray-500 mt-1">Click to show all in series</div>
                    </button>
                </TooltipContent>
            </Tooltip>
        );
    };

    const handlePreviousSymbolClick = async (previousSymbol: string) => {
        // Find the resolution with the matching symbol in current data
        const targetResolution = resolutions.find(res => res.symbol === previousSymbol);

        if (targetResolution) {
            // Found in current view - scroll to it and highlight
            const tableElement = document.querySelector('.p-datatable-tbody');
            if (tableElement) {
                const rows = tableElement.querySelectorAll('tr');
                const targetIndex = resolutions.findIndex(res => res.symbol === previousSymbol);

                if (targetIndex !== -1 && rows[targetIndex]) {
                    rows[targetIndex].scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });

                    // Briefly highlight the row with UN blue - less aggressive
                    const originalBackground = rows[targetIndex].style.backgroundColor;
                    rows[targetIndex].style.backgroundColor = '#009edb20'; // UN blue with transparency
                    rows[targetIndex].style.borderLeft = '4px solid #009edb'; // UN blue border
                    setTimeout(() => {
                        rows[targetIndex].style.backgroundColor = originalBackground;
                        rows[targetIndex].style.borderLeft = '';
                    }, 800);
                }
            }
        } else {
            // Not found in current view - fetch and show just this resolution
            try {
                setLoading(true);

                // Fetch all resolutions to find the target
                const response = await fetch('/api/resolutions?limit=10000'); // Get all to search
                if (!response.ok) {
                    throw new Error('Failed to fetch resolutions');
                }
                const data: ApiResponse = await response.json();

                // Find the target resolution
                const targetResolution = data.data.find(res => res.symbol === previousSymbol);

                if (targetResolution) {
                    // Show just this resolution
                    setResolutions([targetResolution]);
                    setPagination({
                        page: 1,
                        limit: 1,
                        total: 1,
                        totalPages: 1
                    });
                    setIsShowingFilteredSubset(true);

                    // Highlight it after a brief delay
                    setTimeout(() => {
                        const tableElement = document.querySelector('.p-datatable-tbody');
                        if (tableElement) {
                            const firstRow = tableElement.querySelector('tr');
                            if (firstRow) {
                                const originalBackground = firstRow.style.backgroundColor;
                                firstRow.style.backgroundColor = '#009edb20'; // UN blue with transparency
                                firstRow.style.borderLeft = '4px solid #009edb'; // UN blue border
                                setTimeout(() => {
                                    firstRow.style.backgroundColor = originalBackground;
                                    firstRow.style.borderLeft = '';
                                }, 800);
                            }
                        }
                    }, 100);
                } else {
                    setError(`Resolution ${previousSymbol} not found in the database.`);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load resolution');
            } finally {
                setLoading(false);
            }
        }
    };

    const frequencyTemplate = (row: Resolution) => {
        // If series_symbol_count is 1, it's a one-time resolution
        if (row.series_symbol_count === 1) {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="text-sm cursor-help">One-time</div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>No previous resolution</p>
                    </TooltipContent>
                </Tooltip>
            );
        }

        // For recurring series, show distance to previous
        if (row.distance_to_previous !== null && row.distance_to_previous !== undefined) {
            const hasPreviousSymbol = row.previous_symbol;

            // Handle special case for same year (distance = 0)
            let displayText;
            if (row.distance_to_previous === 0) {
                displayText = '<1 year ago';
            } else {
                const yearText = row.distance_to_previous === 1 ? 'year' : 'years';
                displayText = `${row.distance_to_previous} ${yearText} ago`;
            }

            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="text-sm cursor-help">{displayText}</div>
                    </TooltipTrigger>
                    <TooltipContent className="p-0">
                        {hasPreviousSymbol ? (
                            <button
                                onClick={() => handlePreviousSymbolClick(row.previous_symbol!)}
                                className="px-3 py-2 text-sm hover:bg-gray-100 transition-colors rounded"
                            >
                                <span className="font-mono">{row.previous_symbol}</span>
                                <div className="text-xs text-gray-500 mt-1">Click to find in table</div>
                            </button>
                        ) : (
                            <p className="px-3 py-2">No previous resolution</p>
                        )}
                    </TooltipContent>
                </Tooltip>
            );
        }

        // Fallback for cases where distance_to_previous is not available
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="text-sm text-gray-400 cursor-help">N/A</div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>No previous resolution</p>
                </TooltipContent>
            </Tooltip>
        );
    };

    const similarityTemplate = (row: Resolution) => {
        // Use similarity_to_previous if available
        const similarity = row.similarity_to_previous || 0;
        if (similarity === null || similarity === 0) {
            return <div className="text-gray-400">N/A</div>;
        }

        // Create gradient from green (low) to red (high)
        const red = Math.round(similarity * 255);
        const green = Math.round((1 - similarity) * 255);
        const color = `rgb(${red}, ${green}, 0)`;

        // Interpretation text based on similarity value
        let interpretation = '';
        if (similarity < 0.2) {
            interpretation = 'Very different';
        } else if (similarity < 0.4) {
            interpretation = 'Somewhat different';
        } else if (similarity < 0.6) {
            interpretation = 'Moderately similar';
        } else if (similarity < 0.8) {
            interpretation = 'Very similar';
        } else {
            interpretation = 'Nearly identical';
        }

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div style={{ color }} className="cursor-help">
                        ~{similarity.toFixed(2)}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-medium">{interpretation}</p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                        1.00 – identical text<br />
                        0.00 – completely different
                    </p>
                </TooltipContent>
            </Tooltip>
        );
    };

    const withinResourcesTemplate = (row: Resolution) => {
        if (row.has_within_existing_resources === null || row.has_within_existing_resources === undefined) {
            return <div className="text-gray-400">N/A</div>;
        }

        return (
            <div className="flex items-center gap-2">
                {row.has_within_existing_resources ? (
                    <Check className="h-4 w-4 text-faded-jade" />
                ) : (
                    <X className="h-4 w-4 text-au-chico" />
                )}
                <span className="text-sm text-muted-foreground">
                    ({row.count_within_existing_resources || 0})
                </span>
            </div>
        );
    };

    const similarityHeaderTemplate = () => (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="cursor-help">Similarity</span>
            </TooltipTrigger>
            <TooltipContent>
                <p>Levenshtein ratio on character level<br />of the document fulltexts</p>
            </TooltipContent>
        </Tooltip>
    );

    const withinResourcesHeaderTemplate = () => (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="cursor-help">Within Resources</span>
            </TooltipTrigger>
            <TooltipContent>
                <p>Shows if a resolution includes<br />"within existing resources" and how often</p>
            </TooltipContent>
        </Tooltip>
    );

    const lengthHeaderTemplate = () => (
        <span>Length <span className="font-normal text-muted-foreground">[words]</span></span>
    );

    const customPaginatorTemplate = {
        layout: 'FirstPageLink PrevPageLink NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport',
        FirstPageLink: (options: any) => (
            <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange({ page: 0, rows: pagination.limit })}
                disabled={pagination.page === 1}
                className="h-8 w-8 p-0 mr-1"
            >
                <ChevronsLeft className="h-3 w-3" />
            </Button>
        ),
        PrevPageLink: (options: any) => (
            <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange({ page: pagination.page - 2, rows: pagination.limit })}
                disabled={pagination.page === 1}
                className="h-8 w-8 p-0 mr-1"
            >
                <ChevronLeft className="h-3 w-3" />
            </Button>
        ),
        NextPageLink: (options: any) => (
            <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange({ page: pagination.page, rows: pagination.limit })}
                disabled={pagination.page >= pagination.totalPages}
                className="h-8 w-8 p-0 mr-1"
            >
                <ChevronRight className="h-3 w-3" />
            </Button>
        ),
        LastPageLink: (options: any) => (
            <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange({ page: pagination.totalPages - 1, rows: pagination.limit })}
                disabled={pagination.page >= pagination.totalPages}
                className="h-8 w-8 p-0 mr-1"
            >
                <ChevronsRight className="h-3 w-3" />
            </Button>
        ),
        CurrentPageReport: (options: any) => (
            <div className="text-sm text-muted-foreground mt-2 text-center w-full">
                Page {pagination.page} of {pagination.totalPages} • {pagination.total.toLocaleString()} items total
            </div>
        )
    };

    if (error) {
        return (
            <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
                <div className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
                    <div className="flex items-center gap-3 mb-6">
                        <FileText className="h-8 w-8 text-un-blue" />
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            All Resolutions
                        </h1>
                    </div>
                    <div className="text-red-500">Error: {error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
            <div className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 mb-6">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-un-blue" />
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            All Resolutions
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={selectedOrgan} onValueChange={handleOrganChange}>
                            <SelectTrigger id="organ-filter" className="w-48 text-sm h-9 border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {organOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedRecurringSeries} onValueChange={handleRecurringSeriesChange}>
                            <SelectTrigger id="recurring-filter" className="w-52 text-sm h-9 border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {recurringSeriesOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="max-w-[95vw] mx-auto px-4 overflow-x-auto">
                <DataTable
                    value={resolutions}
                    loading={loading}
                    stripedRows
                    showGridlines
                    size="small"
                    tableStyle={{ width: "100%", minWidth: "1400px" }}
                    paginator
                    rows={pagination.limit}
                    totalRecords={pagination.total}
                    lazy
                    onPage={handlePageChange}
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    removableSort
                    className="custom-table"
                    paginatorTemplate={customPaginatorTemplate}
                >
                    <Column
                        field="symbol"
                        header="Symbol"
                        body={symbolTemplate}
                        sortable
                        headerClassName="whitespace-nowrap"
                        style={{ width: "10rem" }}
                    />
                    <Column
                        field="year"
                        header="Year"
                        body={yearTemplate}
                        sortable
                        style={{ width: "6rem" }}
                    />
                    <Column
                        field="title"
                        header="Title"
                        body={titleTemplate}
                        sortable
                    />
                    <Column
                        field="word_count"
                        header={lengthHeaderTemplate}
                        body={lengthTemplate}
                        sortable
                        headerClassName="whitespace-nowrap"
                        style={{ width: "9rem" }}
                    />
                    <Column
                        field="series_symbol_count"
                        header="Recurrence"
                        body={recurrenceTemplate}
                        sortable
                        headerClassName="whitespace-nowrap"
                        style={{ width: "10rem" }}
                    />
                    <Column
                        header="Previous"
                        body={frequencyTemplate}
                        headerClassName="whitespace-nowrap"
                        style={{ width: "9rem" }}
                    />
                    <Column
                        field="similarity_to_previous"
                        header={similarityHeaderTemplate}
                        body={similarityTemplate}
                        sortable
                        headerClassName="whitespace-nowrap"
                        style={{ width: "8rem" }}
                    />
                    <Column
                        header={withinResourcesHeaderTemplate}
                        body={withinResourcesTemplate}
                        headerClassName="whitespace-nowrap"
                        style={{ width: "11rem" }}
                    />
                </DataTable>
            </div>
        </div>
    );
}
