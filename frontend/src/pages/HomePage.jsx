import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { getSubscriptionFeed } from '@/api/userApi'
import { getVideosByChannels } from '@/api/videosApi'
import { VideoCard } from '@/components/VideoCard'
import { VideoCardSkeleton } from '@/components/Skeleton'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { Compass, Sparkles, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export function HomePage() {
    // 1. Fetch subscribed channel IDs
    const { data: subFeedData, isLoading: isFeedIdsLoading } = useQuery({
        queryKey: ['subscription_feed'],
        queryFn: getSubscriptionFeed,
    })

    const subscribedChannelIds = subFeedData?.data || []

    // 2. Fetch latest videos for these channels with INFINITE QUERY
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isVideosLoading,
        isError,
    } = useInfiniteQuery({
        queryKey: ['home_feed', subscribedChannelIds],
        queryFn: ({ pageParam }) => getVideosByChannels(subscribedChannelIds, pageParam),
        getNextPageParam: (lastPage) => lastPage.nextPageToken || undefined,
        initialPageParam: undefined,
        enabled: subscribedChannelIds.length > 0,
    })

    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    const { sentinelRef } = useInfiniteScroll(loadMore, { enabled: hasNextPage && !isFetchingNextPage })

    const allVideos = data?.pages.flatMap(page => page.data) ?? []
    const isLoading = isFeedIdsLoading || (isVideosLoading && subscribedChannelIds.length > 0)

    return (
        <div className="px-4 py-6 lg:px-6 max-w-[1800px] mx-auto">
            {/* Header / Intro */}
            {subscribedChannelIds.length > 0 && (
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">For You</h1>
                        <p className="text-xs text-muted-foreground">Latest from your favorite creators</p>
                    </div>
                </div>
            )}

            {/* Error state */}
            {isError && (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                    <p className="text-muted-foreground font-medium">Failed to load your personal feed.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-sm text-blue-500 font-semibold hover:underline"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Main Content */}
            {isLoading ? (
                <div className="grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 12 }).map((_, i) => <VideoCardSkeleton key={i} />)}
                </div>
            ) : subscribedChannelIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center gap-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="h-24 w-24 rounded-full bg-accent/30 flex items-center justify-center shadow-inner">
                        <Compass className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-foreground">Start your feed</h2>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            Your home feed is currently empty. Subscribe to channels to see the latest videos from creators you love right here.
                        </p>
                    </div>
                    <Link to="/search" className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-3 rounded-full font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 mt-2">
                        Find Channels to Follow
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {allVideos.map((video, idx) => (
                        <VideoCard key={`${video.id}-${idx}`} video={video} />
                    ))}
                </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {/* Next page loading spinner */}
            {isFetchingNextPage && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {/* End of feed */}
            {!hasNextPage && allVideos.length > 0 && (
                <div className="mt-20 flex flex-col items-center gap-4 pt-10 border-t border-border/30 pb-10">
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
                        You've reached the end of your feed
                    </p>
                </div>
            )}
        </div>
    )
}


