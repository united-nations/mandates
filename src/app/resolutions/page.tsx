"use client";

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    const [selectedOrgan, setSelectedOrgan] = useState<string>('A/');

    const organOptions = [
        { value: 'all', label: 'All Organs' },
        { value: 'A/', label: 'General Assembly' },
        { value: 'E/', label: 'Economic and Social Council' },
        { value: 'S/', label: 'Security Council' },
        { value: 'A/HRC/', label: 'Human Rights Council' },
        // { value: 'ST/', label: 'Secretariat' },
        // { value: 'T/', label: 'Trusteeship Council' },
    ];

    const fetchResolutions = async (page: number = 1, limit: number = 20, sortField: string = 'year', sortOrder: string = 'desc', organ: string = 'A/') => {
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

            const response = await fetch(`/api/resolutions?${params}`);
            if (!response.ok) {
                throw new Error('Failed to fetch resolutions');
            }
            const data: ApiResponse = await response.json();
            setResolutions(data.data);
            setPagination(data.pagination);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResolutions(1, 20, 'year', 'desc', selectedOrgan);
    }, [selectedOrgan]);

    const handleSort = (e: any) => {
        const newSortField = e.sortField as keyof Resolution;
        const newSortOrder = e.sortOrder as 1 | -1;
        setSortField(newSortField);
        setSortOrder(newSortOrder);
        fetchResolutions(pagination.page, pagination.limit, newSortField, newSortOrder === 1 ? 'asc' : 'desc', selectedOrgan);
    };

    const handlePageChange = (e: any) => {
        const newPage = e.page + 1; // PrimeReact uses 0-based indexing
        fetchResolutions(newPage, e.rows, sortField, sortOrder === 1 ? 'asc' : 'desc', selectedOrgan);
    };

    const handleOrganChange = (value: string) => {
        setSelectedOrgan(value);
        // fetchResolutions will be called by useEffect when selectedOrgan changes
    };

    const titleTemplate = (row: Resolution) => (
        <div className="truncate max-w-[32rem]">
            <span className="font-medium">{row.title || row.combined_title}</span>
        </div>
    );

    const symbolTemplate = (row: Resolution) => (
        <div className="font-mono text-sm">
            {row.symbol}
        </div>
    );

    const lengthTemplate = (row: Resolution) => (
        <div>
            {row.word_count ? `~${row.word_count.toLocaleString()}` : 'N/A'}
        </div>
    );

    const recurrenceTemplate = (row: Resolution) => (
        <div className="text-sm">
            <div className="font-medium">{row.series_symbol_count} total</div>
            <div className="text-muted-foreground">
                {row.series_first_year === row.series_last_year
                    ? `${row.series_first_year}`
                    : `${row.series_first_year}-${row.series_last_year}`}
            </div>
        </div>
    );

    const frequencyTemplate = (row: Resolution) => (
        <div className="text-sm">
            {row.is_recurring_series ? 'Recurring' : 'One-time'}
        </div>
    );

    const similarityTemplate = (row: Resolution) => {
        // Use similarity_to_previous if available
        const similarity = row.similarity_to_previous || 0;
        if (similarity === null || similarity === 0) {
            return <div className="text-muted-foreground">N/A</div>;
        }

        // Create gradient from green (low) to red (high)
        const red = Math.round(similarity * 255);
        const green = Math.round((1 - similarity) * 255);
        const color = `rgb(${red}, ${green}, 0)`;

        return (
            <div style={{ color }}>
                {similarity.toFixed(2)}
            </div>
        );
    };

    const withinResourcesTemplate = (row: Resolution) => (
        <div className="flex items-center gap-2">
            {row.has_within_existing_resources ? (
                <Check className="h-4 w-4" />
            ) : (
                <X className="h-4 w-4" />
            )}
            <span className="text-sm text-muted-foreground">
                ({row.count_within_existing_resources || 0})
            </span>
        </div>
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
                        header="Length [words]"
                        body={lengthTemplate}
                        sortable
                        headerClassName="whitespace-nowrap"
                        style={{ width: "9rem" }}
                    />
                    <Column
                        header="Recurrence"
                        body={recurrenceTemplate}
                        headerClassName="whitespace-nowrap"
                        style={{ width: "10rem" }}
                    />
                    <Column
                        header="Avg. Frequency"
                        body={frequencyTemplate}
                        headerClassName="whitespace-nowrap"
                        style={{ width: "9rem" }}
                    />
                    <Column
                        field="similarity_to_previous"
                        header="Similarity"
                        body={similarityTemplate}
                        sortable
                        headerClassName="whitespace-nowrap"
                        style={{ width: "8rem" }}
                    />
                    <Column
                        header="Within Resources"
                        body={withinResourcesTemplate}
                        headerClassName="whitespace-nowrap"
                        style={{ width: "11rem" }}
                    />
                </DataTable>
            </div>
        </div>
    );
}
