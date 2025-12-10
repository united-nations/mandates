"use client";

import { Suspense } from "react";
import { ReportsExplorer } from "@/components/reports-explorer";
import { LoadingFallback } from "@/components/loading-fallback";

export default function ReportsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <div className="space-y-6 pb-16">
        <ReportsExplorer />
      </div>
    </Suspense>
  );
}
