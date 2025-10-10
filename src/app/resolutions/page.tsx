'use client';

import { Suspense } from 'react';
import ResolutionsPageWrapper from '@/components/resolutions-page-wrapper';
import { LoadingFallback } from '@/components/ui/loading-fallback';

export default function ResolutionsPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <ResolutionsPageWrapper />
        </Suspense>
    );
}
