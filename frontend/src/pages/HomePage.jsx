import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { getRandomFeed } from '@/api/videosApi'
import { VideoCard } from '@/components/VideoCard'
import { VideoCardSkeleton } from '@/components/Skeleton'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { Loader2 } from 'lucide-react'

export function HomePage() {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
    } = useInfiniteQuery({
        queryKey: ['feed'],
        queryFn: ({ pageParam = 1 }) => getRandomFeed(pageParam),
        getNextPageParam: (lastPage) =>
            lastPage.hasMore ? lastPage.page + 1 : undefined,
        initialPageParam: 1,
    })

    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    const { sentinelRef } = useInfiniteScroll(loadMore, { enabled: hasNextPage && !isFetchingNextPage })

    const allVideos = data?.pages.flatMap(page => page.data) ?? []

    return (
        <div className="px-4 py-6 lg:px-6">
            {/* Category filter chips (UI only) */}
            <div className="mb-6 -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-2 scrollbar-none">
                {['All', 'Gaming', 'Music', 'Live', 'Science', 'Education', 'Tech', 'News', 'Sports', 'Comedy'].map(cat => (
                    <button
                        key={cat}
                        className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background first:bg-foreground/90 hover:bg-foreground/80 transition-colors"
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Error state */}
            {isError && (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                    Failed to load feed. Please try again.
                </div>
            )}

            {/* Video grid */}
            <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 ">
                {isLoading
                    ? Array.from({ length: 12 }).map((_, i) => <VideoCardSkeleton key={i} />)
                    : allVideos.map(video => (
                        <VideoCard key={video._uid || video.id} video={video} />
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

            {/* End of feed */}
            {!hasNextPage && allVideos.length > 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                    You've reached the end of your feed
                </p>
            )}
        </div>
    )
}
