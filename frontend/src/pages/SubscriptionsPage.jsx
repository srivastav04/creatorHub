import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/clerk-react'
import { getSubscriptionFeed, getSubscriptions, toggleSubscription } from '@/api/userApi'
import { getVideosByChannels } from '@/api/videosApi'
import { VideoCard } from '@/components/VideoCard'
import { VideoCardSkeleton } from '@/components/Skeleton'
import { Compass, LayoutGrid, List, X, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils'

export function SubscriptionsPage() {
    const { user } = useUser()
    const queryClient = useQueryClient()
    const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
    const [isManageMode, setIsManageMode] = useState(false)

    // 1. Fetch channel IDs
    const { data: subFeedData, isLoading: isFeedIdsLoading } = useQuery({
        queryKey: ['subscription_feed'],
        queryFn: getSubscriptionFeed,
    })

    const subscribedChannelIds = subFeedData?.data || []

    // 2. Fetch full channel data for the top bar
    const { data: subsData, isLoading: isSubsLoading } = useQuery({
        queryKey: ['subscriptions'],
        queryFn: getSubscriptions,
    })

    // 3. Fetch latest videos for these channels from YouTube API
    const { data: videosData, isLoading: isVideosLoading } = useQuery({
        queryKey: ['subscription_videos', subscribedChannelIds],
        queryFn: () => getVideosByChannels(subscribedChannelIds),
        enabled: subscribedChannelIds.length > 0,
    })

    const subscriptions = subsData?.data || []
    const feed = videosData?.data || []

    const isLoading = isFeedIdsLoading || isSubsLoading || (isVideosLoading && subscribedChannelIds.length > 0)

    // 4. Remove subscription mutation
    const unsubscribeMutation = useMutation({
        mutationFn: (channelId) => toggleSubscription(channelId, user?.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
            queryClient.invalidateQueries({ queryKey: ['subscription_feed'] })
            queryClient.invalidateQueries({ queryKey: ['subscription_videos'] })
            queryClient.invalidateQueries({ queryKey: ['home_feed'] })
        },
        onSettled: async () => {
            // Refetch to ensure UI updates immediately
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ['subscription_feed'] }),
                queryClient.refetchQueries({ queryKey: ['subscriptions'] }),
                queryClient.refetchQueries({ queryKey: ['subscription_videos'] })
            ])
        }
    })

    const handleUnsubscribe = (e, channelId) => {
        e.preventDefault()
        e.stopPropagation()
        if (window.confirm('Unsubscribe from this channel?')) {
            unsubscribeMutation.mutate(channelId)
        }
    }

    return (
        <div className="container mx-auto px-4 py-6 md:px-6 lg:px-8 max-w-[1800px]">
            {/* Header Section */}
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Compass className="h-7 w-7 text-primary animate-pulse" />
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Latest Subscriptions</h1>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                        <button
                            onClick={() => setIsManageMode(!isManageMode)}
                            className={cn(
                                "text-sm font-semibold transition-colors uppercase tracking-wide",
                                isManageMode ? "text-primary font-bold" : "text-blue-500 hover:text-blue-600"
                            )}
                        >
                            {isManageMode ? 'Done' : 'Manage'}
                        </button>
                        <div className="flex items-center gap-1 bg-accent/30 p-1 rounded-xl border border-border/50">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-2 rounded-lg transition-all duration-200",
                                    viewMode === 'grid' ? "bg-background text-foreground shadow-sm" : "hover:bg-accent text-muted-foreground"
                                )}
                                title="Grid view"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "p-2 rounded-lg transition-all duration-200",
                                    viewMode === 'list' ? "bg-background text-foreground shadow-sm" : "hover:bg-accent text-muted-foreground"
                                )}
                                title="List view"
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Horizontal Channel List */}
                {subscriptions.length > 0 && (
                    <div className="flex items-center gap-6 overflow-x-auto pb-4 scrollbar-none no-scrollbar mask-fade-right">
                        {subscriptions.map((ytber) => (
                            <div key={ytber.id} className="relative group shrink-0 min-w-[80px]">
                                <Link
                                    to={`/channel/${ytber.id}`}
                                    className="flex flex-col items-center gap-2"
                                >
                                    <div className="relative">
                                        <img
                                            src={ytber.avatar}
                                            alt={ytber.name}
                                            className={cn(
                                                "h-14 w-14 lg:h-16 lg:w-16 rounded-full object-cover ring-2 ring-border transition-all duration-300 shadow-md",
                                                isManageMode ? "ring-red-400" : "group-hover:ring-primary"
                                            )}
                                        />
                                        {!isManageMode && (
                                            <div className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-blue-500 border-2 border-background shadow-sm" title="New videos available" />
                                        )}
                                    </div>
                                    <span className="text-[11px] lg:text-xs font-semibold text-center truncate w-full px-1 text-muted-foreground group-hover:text-foreground transition-colors">
                                        {ytber.name}
                                    </span>
                                </Link>

                                {/* Unsubscribe Button overlay */}
                                {(isManageMode || unsubscribeMutation.variables === ytber.id) && (
                                    <button
                                        onClick={(e) => handleUnsubscribe(e, ytber.id)}
                                        disabled={unsubscribeMutation.isPending && unsubscribeMutation.variables === ytber.id}
                                        className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg border-2 border-background hover:bg-red-600 transition-colors z-10 animate-in zoom-in-50"
                                        title="Unsubscribe"
                                    >
                                        {unsubscribeMutation.isPending && unsubscribeMutation.variables === ytber.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <X className="h-3 w-3" />
                                        )}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Video Feed */}
            {isLoading ? (
                <div className={cn(
                    "grid gap-x-4 gap-y-8",
                    viewMode === 'grid'
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                        : "flex flex-col max-w-4xl mx-auto"
                )}>
                    {Array.from({ length: 10 }).map((_, i) => <VideoCardSkeleton key={i} horizontal={viewMode === 'list'} />)}
                </div>
            ) : feed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center gap-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="h-24 w-24 rounded-full bg-accent/30 flex items-center justify-center shadow-inner">
                        <Compass className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-foreground">Don't miss a thing</h2>
                        <p className="text-muted-foreground max-w-xs">Subscribe to your favorite channels to see their latest videos here.</p>
                    </div>
                    <Link to="/home" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-2.5 rounded-full font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105">
                        Browse channels
                    </Link>
                </div>
            ) : (
                <div className={cn(
                    "grid gap-x-4 gap-y-10",
                    viewMode === 'grid'
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                        : "flex flex-col max-w-4xl mx-auto gap-y-6"
                )}>
                    {feed.map(video => (
                        <VideoCard
                            key={video.id}
                            video={video}
                            className={viewMode === 'list' ? "flex-row" : ""}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}


