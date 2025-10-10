"use client";

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { BaseDocument, DocumentConfig, DocumentFilters } from "@/types";
import { Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, RotateCcw, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { useEffect, useState } from "react";

interface ApiResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

interface DocumentTableProps<T extends BaseDocument> {
    config: DocumentConfig<T>;
    filters?: DocumentFilters;
    hideHeader?: boolean;
}

export default function DocumentTable<T extends BaseDocument>({
    config,
    filters: propFilters,
    hideHeader = false
}: DocumentTableProps<T>) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    const [documents, setDocuments] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    // Initialize state from URL parameters (fallback) or props
    const [sortField, setSortField] = useState<string>(
        searchParams.get('sortField') || 'year'
    );
    const [sortOrder, setSortOrder] = useState<1 | -1>(
        searchParams.get('sortOrder') === 'asc' ? 1 : -1
    );
    
    // Use prop filters if provided, otherwise read from URL (for backwards compatibility)
    const selectedOrgan = propFilters?.organ || searchParams.get('organ') || config.defaultOrgan;
    const selectedRecurringSeries = propFilters?.is_recurring_series || searchParams.get('is_recurring_series') || 'all';
    const selectedLengthBucket = propFilters?.length_bucket || searchParams.get('length_bucket') || 'all';
    
    const [isShowingFilteredSubset, setIsShowingFilteredSubset] = useState(
        searchParams.get('view') === 'series' || searchParams.get('view') === 'single'
    );

    const recurringSeriesOptions = [
        { value: 'all', label: 'All Documents' },
        { value: 'true', label: 'Recurring Documents' },
        { value: 'false', label: 'One-time Documents' },
    ];

    // Function to update URL parameters
    const updateURL = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString())

        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === '' ||
                (key === 'organ' && value === config.defaultOrgan) ||
                (key === 'recurringSeries' && value === 'all') ||
                (key === 'sortField' && value === 'year') ||
                (key === 'sortOrder' && value === 'desc') ||
                (key === 'page' && value === '1')) {
                params.delete(key)
            } else {
                params.set(key, value)
            }
        })

        const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname
        router.replace(newURL, { scroll: false })
    }

    const fetchDocuments = async (page: number = 1, limit: number = 20, sortField: string = 'year', sortOrder: string = 'desc', organ: string = config.defaultOrgan, recurringSeries: string = 'all', lengthBucket: string = 'all', updateUrl: boolean = true) => {
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

            if (lengthBucket !== 'all') {
                params.append('length_bucket', lengthBucket);
            }

            const response = await fetch(`${config.apiEndpoint}?${params}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${config.type}`);
            }
            const data: ApiResponse<T> = await response.json();
            setDocuments(data.data);
            setPagination(data.pagination);
            setError(null);
            setIsShowingFilteredSubset(false);

            // Update URL parameters
            if (updateUrl) {
                updateURL({
                    page: page > 1 ? page.toString() : null,
                    sortField: sortField !== 'year' ? sortField : null,
                    sortOrder: sortOrder !== 'desc' ? sortOrder : null,
                    organ: organ !== config.defaultOrgan ? organ : null,
                    recurringSeries: recurringSeries !== 'all' ? recurringSeries : null,
                    length_bucket: lengthBucket !== 'all' ? lengthBucket : null,
                    view: null // Clear any series/single view
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const currentPage = parseInt(searchParams.get('page') || '1', 10);

        // Update pagination state from URL
        setPagination(prev => ({ ...prev, page: currentPage }));

        // Check if we need to load a specific series or single document
        const view = searchParams.get('view');
        const seriesTitle = searchParams.get('seriesTitle');
        const seriesOrgan = searchParams.get('seriesOrgan');
        const singleSymbol = searchParams.get('symbol');

        if (view === 'series' && seriesTitle && seriesOrgan) {
            // Load specific series
            handleSeriesClick(seriesTitle, seriesOrgan, false); // false = don't update URL
        } else if (view === 'single' && singleSymbol) {
            // Load specific document
            handlePreviousSymbolClick(singleSymbol, false); // false = don't update URL
        } else {
            // Normal page load - only fetch if this is the initial load or if URL params actually changed
            fetchDocuments(currentPage, 20, sortField, sortOrder === 1 ? 'asc' : 'desc', selectedOrgan, selectedRecurringSeries, selectedLengthBucket, false);
        }
    }, []); // Remove dependencies to avoid infinite loops

    // Watch for prop filters changes and re-fetch (for resolutions page)
    useEffect(() => {
        if (propFilters) {
            const currentPage = parseInt(searchParams.get('page') || '1', 10);
            const organ = propFilters.organ || 'all';
            const recurringSeries = propFilters.is_recurring_series || 'all';
            const lengthBucket = propFilters.length_bucket || 'all';
            
            fetchDocuments(currentPage, 20, sortField, sortOrder === 1 ? 'asc' : 'desc', organ, recurringSeries, lengthBucket, false);
        }
    }, [propFilters?.organ, propFilters?.is_recurring_series, propFilters?.length_bucket, propFilters?.similarity_bucket]);

    // Separate effect for handling direct URL changes (like back/forward navigation)
    // Only active when filters are not passed as props
    useEffect(() => {
        if (propFilters) return; // Skip if using prop filters

        const handlePopState = () => {
            // Force re-read URL parameters when user navigates back/forward
            const newOrgan = searchParams.get('organ') || config.defaultOrgan;
            const newRecurringSeries = searchParams.get('is_recurring_series') || 'all';
            const newSortField = searchParams.get('sortField') || 'year';
            const newSortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
            const newPage = parseInt(searchParams.get('page') || '1', 10);
            const newLengthBucket = searchParams.get('length_bucket') || 'all';

            setSortField(newSortField);
            setSortOrder(newSortOrder);

            // Check for special views
            const view = searchParams.get('view');
            if (view === 'series') {
                const seriesTitle = searchParams.get('seriesTitle');
                const seriesOrgan = searchParams.get('seriesOrgan');
                if (seriesTitle && seriesOrgan) {
                    handleSeriesClick(seriesTitle, seriesOrgan, false);
                }
            } else if (view === 'single') {
                const symbol = searchParams.get('symbol');
                if (symbol) {
                    handlePreviousSymbolClick(symbol, false);
                }
            } else {
                // Normal fetch with URL parameters
                fetchDocuments(newPage, 20, newSortField, newSortOrder === 1 ? 'asc' : 'desc', newOrgan, newRecurringSeries, newLengthBucket, false);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [searchParams, propFilters]);

    // Watch for length_bucket changes from URL and re-fetch
    // Only active when filters are not passed as props
    useEffect(() => {
        if (propFilters) return; // Skip if using prop filters
        
        const urlLengthBucket = searchParams.get('length_bucket') || 'all';
        if (urlLengthBucket !== selectedLengthBucket) {
            const currentPage = parseInt(searchParams.get('page') || '1', 10);
            fetchDocuments(currentPage, 20, sortField, sortOrder === 1 ? 'asc' : 'desc', selectedOrgan, selectedRecurringSeries, urlLengthBucket, false);
        }
    }, [searchParams.get('length_bucket'), propFilters]);

    const handleSort = (e: any) => {
        const newSortField = e.sortField as string;
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
            const sortedDocuments = [...documents].sort((a, b) => {
                const aValue = a[newSortField as keyof T];
                const bValue = b[newSortField as keyof T];

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

            setDocuments(sortedDocuments);

            // Update URL for client-side sorting too
            updateURL({
                sortField: newSortField !== 'year' ? newSortField : null,
                sortOrder: newSortOrder !== -1 ? (newSortOrder === 1 ? 'asc' : 'desc') : null,
            });
        } else {
            // Normal server-side sorting for full dataset
            updateURL({
                sortField: newSortField !== 'year' ? newSortField : null,
                sortOrder: newSortOrder !== -1 ? (newSortOrder === 1 ? 'asc' : 'desc') : null,
            });

            fetchDocuments(pagination.page, pagination.limit, newSortField, newSortOrder === 1 ? 'asc' : 'desc', selectedOrgan, selectedRecurringSeries, selectedLengthBucket, false);
        }
    };

    const handlePageChange = (e: any) => {
        const newPage = e.page + 1; // PrimeReact uses 0-based indexing

        // Update URL immediately
        updateURL({
            page: newPage > 1 ? newPage.toString() : null
        });

        // Fetch new data
        fetchDocuments(newPage, e.rows, sortField, sortOrder === 1 ? 'asc' : 'desc', selectedOrgan, selectedRecurringSeries, selectedLengthBucket, false);
    };

    const handleOrganChange = (value: string) => {
        // When filters are passed as props, filter changes are handled by parent
        if (propFilters) return;
        
        setIsShowingFilteredSubset(false);

        // Update URL immediately
        updateURL({
            organ: value !== config.defaultOrgan ? value : null,
            page: null, // Reset to page 1
            view: null, // Clear any series/single view
            seriesTitle: null,
            seriesOrgan: null,
            symbol: null
        });

        // Fetch new data
        fetchDocuments(1, 20, sortField, sortOrder === 1 ? 'asc' : 'desc', value, selectedRecurringSeries, selectedLengthBucket, false);
    };

    const handleRecurringSeriesChange = (value: string) => {
        // When filters are passed as props, filter changes are handled by parent
        if (propFilters) return;
        
        setIsShowingFilteredSubset(false);

        // Update URL immediately
        updateURL({
            is_recurring_series: value !== 'all' ? value : null,
            page: null, // Reset to page 1
            view: null, // Clear any series/single view
            seriesTitle: null,
            seriesOrgan: null,
            symbol: null
        });

        // Fetch new data
        fetchDocuments(1, 20, sortField, sortOrder === 1 ? 'asc' : 'desc', selectedOrgan, value, selectedLengthBucket, false);
    };

    const handleResetFilters = () => {
        // When filters are passed as props, filter changes are handled by parent
        if (propFilters) return;
        
        setIsShowingFilteredSubset(false);
        setSortField('year');
        setSortOrder(-1);

        // Reset URL to default state
        updateURL({
            organ: null,
            is_recurring_series: null,
            page: null,
            sortField: null,
            sortOrder: null,
            view: null,
            seriesTitle: null,
            seriesOrgan: null,
            symbol: null
        });

        // Fetch fresh data with default parameters
        fetchDocuments(1, 20, 'year', 'desc', config.defaultOrgan, 'all', 'all', false);
    };

    const handleSeriesClick = async (normalizedTitle: string, organ: string, updateUrl: boolean = true) => {
        try {
            setLoading(true);

            // Fetch all documents to find the series
            const response = await fetch(`${config.apiEndpoint}?limit=10000`); // Get all to search
            if (!response.ok) {
                throw new Error(`Failed to fetch ${config.type}`);
            }
            const data: ApiResponse<T> = await response.json();

            // Find all documents in the same series (same normalized_title and organ)
            const seriesDocuments = data.data.filter(doc =>
                doc.normalized_title === normalizedTitle && doc.organ === organ
            );

            if (seriesDocuments.length > 0) {
                // Sort by year to show chronological order (highest year on top)
                const sortedSeries = seriesDocuments.sort((a, b) => b.year - a.year);

                // Show the entire series
                setDocuments(sortedSeries);
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

                // Update URL with series view parameters
                if (updateUrl) {
                    updateURL({
                        view: 'series',
                        seriesTitle: normalizedTitle,
                        seriesOrgan: organ,
                        symbol: null, // Clear any single symbol
                        page: null,
                        sortField: null, // Use default year sorting
                        sortOrder: null // Use default desc sorting
                    });
                }

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

    const handlePreviousSymbolClick = async (previousSymbol: string, updateUrl: boolean = true) => {
        // Find the document with the matching symbol in current data
        const targetDocument = documents.find(doc => doc.symbol === previousSymbol);

        if (targetDocument) {
            // Found in current view - scroll to it and highlight
            const tableElement = document.querySelector('.p-datatable-tbody');
            if (tableElement) {
                const rows = tableElement.querySelectorAll('tr');
                const targetIndex = documents.findIndex(doc => doc.symbol === previousSymbol);

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
            // Not found in current view - fetch and show just this document
            try {
                setLoading(true);

                // Fetch all documents to find the target
                const response = await fetch(`${config.apiEndpoint}?limit=10000`); // Get all to search
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${config.type}`);
                }
                const data: ApiResponse<T> = await response.json();

                // Find the target document
                const targetDocument = data.data.find(doc => doc.symbol === previousSymbol);

                if (targetDocument) {
                    // Show just this document
                    setDocuments([targetDocument]);
                    setPagination({
                        page: 1,
                        limit: 1,
                        total: 1,
                        totalPages: 1
                    });
                    setIsShowingFilteredSubset(true);

                    // Update URL with single document view
                    if (updateUrl) {
                        updateURL({
                            view: 'single',
                            symbol: previousSymbol,
                            seriesTitle: null, // Clear any series params
                            seriesOrgan: null,
                            page: null,
                            sortField: null,
                            sortOrder: null
                        });
                    }

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
                    setError(`${config.type.slice(0, -1).charAt(0).toUpperCase() + config.type.slice(1, -1)} ${previousSymbol} not found in the database.`);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : `Failed to load ${config.type.slice(0, -1)}`);
            } finally {
                setLoading(false);
            }
        }
    };

    // Template functions
    const titleTemplate = (row: T) => (
        <div className="truncate max-w-[20rem] sm:max-w-[24rem] md:max-w-[28rem] lg:max-w-[32rem] xl:max-w-[40rem]" title={row.title || row.combined_title}>
            <span className="font-medium">{row.title || row.combined_title}</span>
        </div>
    );

    const symbolTemplate = (row: T) => (
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

    const yearTemplate = (row: T) => (
        <div>{row.year === 0 ? 'N/A' : row.year}</div>
    );

    const lengthTemplate = (row: T) => {
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

    const recurrenceTemplate = (row: T) => {
        // Only show tooltip for recurring series (more than 1 document)
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
                        <p>Standalone {config.type.slice(0, -1)}</p>
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
                        View entire series ({row.series_symbol_count} {config.type})
                        <div className="text-xs text-gray-500 mt-1">Click to show all in series</div>
                    </button>
                </TooltipContent>
            </Tooltip>
        );
    };

    const frequencyTemplate = (row: T) => {
        // If series_symbol_count is 1, it's a one-time document
        if (row.series_symbol_count === 1) {
            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="text-sm cursor-help">One-time</div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>No previous {config.type.slice(0, -1)}</p>
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
                            <p className="px-3 py-2">No previous {config.type.slice(0, -1)}</p>
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
                    <p>No previous {config.type.slice(0, -1)}</p>
                </TooltipContent>
            </Tooltip>
        );
    };

    const similarityTemplate = (row: T) => {
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

        // Check if we have a previous symbol to compare with
        const hasPreviousSymbol = row.previous_symbol;

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div style={{ color }} className="cursor-help">
                        ~{similarity.toFixed(2)}
                    </div>
                </TooltipTrigger>
                <TooltipContent className="p-0">
                    <div className="p-3">
                        <p className="font-medium">{interpretation}</p>
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                            1.00 – identical text<br />
                            0.00 – completely different
                        </p>
                        {hasPreviousSymbol && (
                            <div className="mt-2 pt-2 border-t">
                                <a
                                    href={`/diff?symbol1=${encodeURIComponent(row.previous_symbol!)}&symbol2=${encodeURIComponent(row.symbol)}`}
                                    className="text-un-blue hover:text-un-blue/80 hover:underline text-sm font-medium"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Compare documents →
                                </a>
                                <div className="text-xs text-gray-500 mt-1">
                                    View side-by-side diff
                                </div>
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    };

    const withinResourcesTemplate = (row: T) => {
        // Type guard to check if this is a Resolution
        if (!('has_within_existing_resources' in row)) {
            return null;
        }

        const resolution = row as any; // Cast to access resolution-specific fields
        if (resolution.has_within_existing_resources === null || resolution.has_within_existing_resources === undefined) {
            return <div className="text-gray-400">N/A</div>;
        }

        return (
            <div className="flex items-center gap-2">
                {resolution.has_within_existing_resources ? (
                    <Check className="h-4 w-4 text-faded-jade" />
                ) : (
                    <X className="h-4 w-4 text-au-chico" />
                )}
                <span className="text-sm text-muted-foreground">
                    ({resolution.count_within_existing_resources || 0})
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
                            {config.title}
                        </h1>
                    </div>
                    <div className="text-red-500">Error: {error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
            {!hideHeader && (
                <div className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 mb-6 pt-8">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-un-blue" />
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                {config.title}
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={selectedOrgan} onValueChange={handleOrganChange}>
                                <SelectTrigger id="organ-filter" className="w-48 text-sm h-9 border-slate-300 focus:border-blue-500 focus:ring-blue-500 bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {config.organOptions.map(option => (
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
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleResetFilters}
                                className="h-9 px-3 text-sm border-slate-300"
                                title="Reset filters to default"
                            >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Reset
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-[95vw] mx-auto px-4 overflow-x-auto mt-8">
                <DataTable
                    value={documents}
                    loading={loading}
                    stripedRows
                    showGridlines
                    size="small"
                    tableStyle={{ width: "100%", minWidth: "1200px" }}
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
                    {config.columns.symbol && (
                        <Column
                            field="symbol"
                            header="Symbol"
                            body={symbolTemplate}
                            sortable
                            headerClassName="whitespace-nowrap"
                            style={{ width: "8rem" }}
                        />
                    )}
                    {config.columns.year && (
                        <Column
                            field="year"
                            header="Year"
                            body={yearTemplate}
                            sortable
                            style={{ width: "5rem" }}
                        />
                    )}
                    {config.columns.title && (
                        <Column
                            field="title"
                            header="Title"
                            body={titleTemplate}
                            sortable
                            style={{ width: "20rem", maxWidth: "20rem" }}
                        />
                    )}
                    {config.columns.length && (
                        <Column
                            field="word_count"
                            header={lengthHeaderTemplate}
                            body={lengthTemplate}
                            sortable
                            headerClassName="whitespace-nowrap"
                            style={{ width: "7rem" }}
                        />
                    )}
                    {config.columns.recurrence && (
                        <Column
                            field="series_symbol_count"
                            header="Recurrence"
                            body={recurrenceTemplate}
                            sortable
                            headerClassName="whitespace-nowrap"
                            style={{ width: "8rem" }}
                        />
                    )}
                    {config.columns.previous && (
                        <Column
                            header="Previous"
                            body={frequencyTemplate}
                            headerClassName="whitespace-nowrap"
                            style={{ width: "7rem" }}
                        />
                    )}
                    {config.columns.similarity && (
                        <Column
                            field="similarity_to_previous"
                            header={similarityHeaderTemplate}
                            body={similarityTemplate}
                            sortable
                            headerClassName="whitespace-nowrap"
                            style={{ width: "7rem" }}
                        />
                    )}
                    {config.columns.withinResources && (
                        <Column
                            header={withinResourcesHeaderTemplate}
                            body={withinResourcesTemplate}
                            headerClassName="whitespace-nowrap"
                            style={{ width: "9rem" }}
                        />
                    )}
                </DataTable>
            </div>
        </div>
    );
}
