"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { DataTable, DataTableSortOrderType } from "primereact/datatable";
import { Column } from "primereact/column";

interface Resolution {
  id: number;
  title: string;
  year: number;
}

export default function ResolutionsPage() {
  const [resolutions] = useState<Resolution[]>([
    { id: 1, title: "Resolution on Climate Action", year: 2023 },
    { id: 2, title: "Resolution on Peacekeeping", year: 2022 },
    { id: 3, title: "Resolution on Digital Rights", year: 2021 },
    { id: 4, title: "Resolution on Humanitarian Aid", year: 2024 },
    { id: 5, title: "Resolution on Global Health", year: 2020 },
  ]);

  const [sortField, setSortField] = useState<keyof Resolution | undefined>();
  const [sortOrder, setSortOrder] = useState<DataTableSortOrderType>(1);

  const titleTemplate = (row: Resolution) => (
    <div className="truncate max-w-[28rem]">
      <span className="font-medium">{row.title}</span>
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
          field="id"
          header="ID"
          sortable
          headerClassName="whitespace-nowrap"
          style={{ width: "6rem" }}
        />
        <Column
          field="title"
          header="Title"
          body={titleTemplate}
          sortable
        />
        <Column
          field="year"
          header="Year"
          sortable
          style={{ width: "8rem" }}
        />
      </DataTable>
    </div>
  );
}
