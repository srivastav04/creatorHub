import { useSearchParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { searchVideos } from '@/api/videosApi'
import { VideoCard } from '@/components/VideoCard'
import { VideoCardSkeleton } from '@/components/Skeleton'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { Loader2, SlidersHorizontal } from 'lucide-react'
import { useCallback } from 'react'

export function SearchPage() {
    const [searchParams] = useSearchParams()
    const query = searchParams.get('q') || ''

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
    } = useInfiniteQuery({
        queryKey: ['search', query],
        queryFn: ({ pageParam, signal }) => searchVideos(query, 12, pageParam, signal),
        getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
        initialPageParam: undefined,
        enabled: !!query,
    })

    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    const { sentinelRef } = useInfiniteScroll(loadMore, { enabled: hasNextPage && !isFetchingNextPage })

    const allVideos = data?.pages.flatMap(page => page.data) ?? []

    return (
        <div className="mx-auto max-w-6xl px-4 py-4 lg:px-6">
            {/* Filters bar */}
            {allVideos.length > 0 && (
                <div className="mb-4 flex items-center justify-between border-b border-border/50 pb-2">
                    <button className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-accent">
                        <SlidersHorizontal className="h-4 w-4" />
                        Filters
                    </button>
                    <p className="text-sm text-muted-foreground">
                        About {data?.pages[0]?.total?.toLocaleString()} results
                    </p>
                </div>
            )}

            {/* Error state */}
            {isError && (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                    Failed to search. Please try again.
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !allVideos.length && query && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-lg font-medium">No results found for "{query}"</p>
                    <p className="text-sm text-muted-foreground">Try different keywords or filters.</p>
                </div>
            )}

            {/* Video List */}
            <div className="flex flex-col gap-4">
                {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <VideoCardSkeleton key={i} horizontal />
                    ))
                    : allVideos.map(video => (
                        <VideoCard
                            key={video.id}
                            video={video}
                            className="flex-row gap-4 sm:gap-6"
                        />
                    ))
                }
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {/* Next page loading spinner */}
            {isFetchingNextPage && (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}
        </div>
    )
}
