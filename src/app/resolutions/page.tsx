"use client";

import { useState } from "react";
import { FileText, Check, X } from "lucide-react";
import { DataTable, DataTableSortOrderType } from "primereact/datatable";
import { Column } from "primereact/column";

interface Resolution {
  id: number;
  symbol: string;
  year: number;
  title: string;
  length: number;
  recurrence: {
    total: number;
    yearRange: string;
    avgFrequency: string;
  };
  levenshteinSimilarity: number;
  withinExistingResources: {
    isWithin: boolean;
    occurrences: number;
  };
}

export default function ResolutionsPage() {
  const [resolutions] = useState<Resolution[]>([
    { 
      id: 1, 
      symbol: "A/RES/79/1",
      title: "Pact for the Future", 
      year: 2024,
      length: 3420,
      recurrence: {
        total: 15,
        yearRange: "2009-2024",
        avgFrequency: "Annual"
      },
      levenshteinSimilarity: 0.8,
      withinExistingResources: {
        isWithin: true,
        occurrences: 12
      }
    },
    { 
      id: 2, 
      symbol: "A/RES/78/245",
      title: "Resolution on Peacekeeping Operations", 
      year: 2023,
      length: 2850,
      recurrence: {
        total: 8,
        yearRange: "2015-2023",
        avgFrequency: "Biannual"
      },
      levenshteinSimilarity: 0.65,
      withinExistingResources: {
        isWithin: false,
        occurrences: 3
      }
    },
    { 
      id: 3, 
      symbol: "A/RES/77/154",
      title: "Digital Rights and Governance", 
      year: 2022,
      length: 1950,
      recurrence: {
        total: 5,
        yearRange: "2018-2022",
        avgFrequency: "Triannual"
      },
      levenshteinSimilarity: 0.72,
      withinExistingResources: {
        isWithin: true,
        occurrences: 8
      }
    },
    { 
      id: 4, 
      symbol: "A/RES/79/89",
      title: "Humanitarian Aid Coordination", 
      year: 2024,
      length: 4100,
      recurrence: {
        total: 22,
        yearRange: "2002-2024",
        avgFrequency: "Annual"
      },
      levenshteinSimilarity: 0.91,
      withinExistingResources: {
        isWithin: true,
        occurrences: 18
      }
    },
    { 
      id: 5, 
      symbol: "A/RES/76/307",
      title: "Global Health Security Framework", 
      year: 2021,
      length: 2750,
      recurrence: {
        total: 12,
        yearRange: "2009-2021",
        avgFrequency: "Biannual"
      },
      levenshteinSimilarity: 0.58,
      withinExistingResources: {
        isWithin: false,
        occurrences: 5
      }
    },
  ]);

  const [sortField, setSortField] = useState<keyof Resolution | undefined>();
  const [sortOrder, setSortOrder] = useState<DataTableSortOrderType>(1);

  const titleTemplate = (row: Resolution) => (
    <div className="truncate max-w-[28rem]">
      <span className="font-medium">{row.title}</span>
    </div>
  );

  const symbolTemplate = (row: Resolution) => (
    <div className="font-mono text-sm">
      {row.symbol}
    </div>
  );

  const lengthTemplate = (row: Resolution) => (
    <div>
      ~{row.length.toLocaleString()}
    </div>
  );

  const recurrenceTemplate = (row: Resolution) => (
    <div className="text-sm">
      <div className="font-medium">{row.recurrence.total} total</div>
      <div className="text-muted-foreground">{row.recurrence.yearRange}</div>
    </div>
  );

  const frequencyTemplate = (row: Resolution) => (
    <div className="text-sm">
      {row.recurrence.avgFrequency}
    </div>
  );

  const similarityTemplate = (row: Resolution) => {
    // Create gradient from green (low) to red (high)
    const similarity = row.levenshteinSimilarity;
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
      {row.withinExistingResources.isWithin ? (
        <Check className="h-4 w-4" />
      ) : (
        <X className="h-4 w-4" />
      )}
      <span className="text-sm text-muted-foreground">
        ({row.withinExistingResources.occurrences})
      </span>
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-8 w-8 text-un-blue" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          All Resolutions
        </h1>
      </div>

      <DataTable
        value={resolutions}
        stripedRows
        showGridlines
        size="small"
        tableStyle={{ width: "100%" }}
        paginator
        rows={5}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={(e) => {
          setSortField(e.sortField as keyof Resolution);
          setSortOrder(e.sortOrder as DataTableSortOrderType);
        }}
        removableSort
        className="custom-table"
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
          field="length"
          header="Length [words]"
          body={lengthTemplate}
          sortable
          headerClassName="whitespace-nowrap"
          style={{ width: "8rem" }}
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
          style={{ width: "8rem" }}
        />
        <Column
          field="levenshteinSimilarity"
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
          style={{ width: "10rem" }}
        />
      </DataTable>
    </div>
  );
}
