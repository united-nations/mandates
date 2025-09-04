"use client";

import { FileText } from 'lucide-react';

export default function ResolutionsPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-8 w-8 text-un-blue" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">All Resolutions</h1>
      </div>
    </div>
  );
}
