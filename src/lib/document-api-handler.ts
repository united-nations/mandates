import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import type { BaseDocument, BucketData, AggregateResponse } from '@/types';
import { lengthBuckets, similarityBuckets, getBucketForValue } from './treemap-config';

// Simple permanent in-memory cache
const documentCache = new Map<string, any[]>();

export function createDocumentHandler<T extends BaseDocument>(
  dataFileName: string,
  documentType: string
) {
  return async function GET(request: NextRequest) {
    try {
      // Check cache first
      let allDocuments: T[] = documentCache.get(dataFileName) as T[];
      
      if (!allDocuments) {
        // Read and permanently cache the JSON file
        const filePath = path.join(process.cwd(), 'data', dataFileName);
        const fileContents = await fs.readFile(filePath, 'utf8');
        allDocuments = JSON.parse(fileContents);
        documentCache.set(dataFileName, allDocuments);
      }

      // Get query parameters for pagination and filtering
      const searchParams = request.nextUrl.searchParams;
      const mode = searchParams.get('mode');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const sortField = searchParams.get('sortField') || 'year';
      const sortOrder = searchParams.get('sortOrder') || 'desc';
      const organ = searchParams.get('organ');
      const isRecurringSeries = searchParams.get('is_recurring_series');
      const lengthBucketParam = searchParams.get('length_bucket');
      const similarityBucketParam = searchParams.get('similarity_bucket');

      // Filter by organ if specified
      let filteredDocuments = allDocuments;
      if (organ) {
        filteredDocuments = filteredDocuments.filter(document =>
          document.organ === organ
        );
      }

      // Filter by recurring series if specified
      if (isRecurringSeries) {
        const isRecurring = isRecurringSeries === 'true';
        filteredDocuments = filteredDocuments.filter(document =>
          document.is_recurring_series === isRecurring
        );
      }

      // Filter by length bucket if specified
      if (lengthBucketParam) {
        const bucket = lengthBuckets.find(b => b.id === lengthBucketParam);
        if (bucket) {
          if (bucket.min === null && bucket.max === null) {
            // Unknown bucket - null values
            filteredDocuments = filteredDocuments.filter(doc => doc.word_count === null);
          } else if (bucket.max === null) {
            // Open-ended range (e.g., ">5k")
            filteredDocuments = filteredDocuments.filter(
              doc => doc.word_count !== null && doc.word_count >= bucket.min!
            );
          } else {
            // Closed range
            filteredDocuments = filteredDocuments.filter(
              doc =>
                doc.word_count !== null &&
                doc.word_count >= bucket.min! &&
                doc.word_count <= bucket.max
            );
          }
        }
      }

      // Filter by similarity bucket if specified
      if (similarityBucketParam) {
        const bucket = similarityBuckets.find(b => b.id === similarityBucketParam);
        if (bucket) {
          if (bucket.min === null && bucket.max === null) {
            // New/First bucket - null values
            filteredDocuments = filteredDocuments.filter(doc => doc.similarity_to_previous === null);
          } else if (bucket.max === null) {
            // Open-ended range
            filteredDocuments = filteredDocuments.filter(
              doc =>
                doc.similarity_to_previous !== null && doc.similarity_to_previous >= bucket.min!
            );
          } else {
            // Closed range
            filteredDocuments = filteredDocuments.filter(
              doc =>
                doc.similarity_to_previous !== null &&
                doc.similarity_to_previous >= bucket.min! &&
                doc.similarity_to_previous <= bucket.max
            );
          }
        }
      }

      // Handle aggregate mode for treemap
      if (mode === 'aggregate') {
        const startTime = performance.now();

        // Initialize buckets for length
        const lengthBucketCounts: Record<string, { count: number; sum: number }> = {};
        lengthBuckets.forEach(bucket => {
          lengthBucketCounts[bucket.id] = { count: 0, sum: 0 };
        });

        // Initialize buckets for similarity
        const similarityBucketCounts: Record<string, { count: number; sum: number }> = {};
        similarityBuckets.forEach(bucket => {
          similarityBucketCounts[bucket.id] = { count: 0, sum: 0 };
        });

        // Count documents with non-null values
        let docsWithWordCount = 0;
        let docsWithSimilarity = 0;

        // Bucket all documents
        filteredDocuments.forEach(doc => {
          // Length bucketing
          const lengthBucketId = getBucketForValue(doc.word_count, lengthBuckets);
          lengthBucketCounts[lengthBucketId].count++;
          if (doc.word_count !== null) {
            lengthBucketCounts[lengthBucketId].sum += doc.word_count;
            docsWithWordCount++;
          }

          // Similarity bucketing
          const similarityBucketId = getBucketForValue(doc.similarity_to_previous, similarityBuckets);
          similarityBucketCounts[similarityBucketId].count++;
          if (doc.similarity_to_previous !== null) {
            similarityBucketCounts[similarityBucketId].sum += doc.similarity_to_previous;
            docsWithSimilarity++;
          }
        });

        const totalCount = filteredDocuments.length;

        // Convert to BucketData format
        const lengthBucketsData: Record<string, BucketData> = {};
        Object.entries(lengthBucketCounts).forEach(([id, data]) => {
          lengthBucketsData[id] = {
            count: data.count,
            percentage: totalCount > 0 ? (data.count / totalCount) * 100 : 0,
            avg_value: data.count > 0 ? data.sum / data.count : undefined,
          };
        });

        const similarityBucketsData: Record<string, BucketData> = {};
        Object.entries(similarityBucketCounts).forEach(([id, data]) => {
          similarityBucketsData[id] = {
            count: data.count,
            percentage: totalCount > 0 ? (data.count / totalCount) * 100 : 0,
            avg_value: data.count > 0 ? data.sum / data.count : undefined,
          };
        });

        const endTime = performance.now();
        const duration = endTime - startTime;

        const response: AggregateResponse = {
          totals: {
            count: totalCount,
            resolutions_with_word_count: docsWithWordCount,
            resolutions_with_similarity: docsWithSimilarity,
          },
          buckets: {
            length: lengthBucketsData,
            similarity: similarityBucketsData,
          },
        };

        // Log performance for monitoring
        console.log(`Aggregate query completed in ${duration.toFixed(2)}ms for ${totalCount} documents`);

        return NextResponse.json(response);
      }

      // Sort the data
      const sortedDocuments = [...filteredDocuments].sort((a, b) => {
        const aValue = a[sortField as keyof T];
        const bValue = b[sortField as keyof T];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortOrder === 'desc' ? -comparison : comparison;
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          const comparison = aValue - bValue;
          return sortOrder === 'desc' ? -comparison : comparison;
        }
        
        return 0;
      });

      // Calculate pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedDocuments = sortedDocuments.slice(startIndex, endIndex);

      return NextResponse.json({
        data: paginatedDocuments,
        pagination: {
          page,
          limit,
          total: filteredDocuments.length,
          totalPages: Math.ceil(filteredDocuments.length / limit),
        },
      });
    } catch (error) {
      console.error(`Error reading ${documentType} data:`, error);
      return NextResponse.json(
        { error: `Failed to load ${documentType} data` },
        { status: 500 }
      );
    }
  };
}
