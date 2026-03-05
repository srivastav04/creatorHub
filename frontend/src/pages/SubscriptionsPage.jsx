import { useQuery } from '@tanstack/react-query'
import { getSubscriptionFeed } from '@/api/userApi'
import { VideoCard } from '@/components/VideoCard'
import { VideoCardSkeleton } from '@/components/Skeleton'
import { Compass } from 'lucide-react'

export function SubscriptionsPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['subscription_feed'],
        queryFn: getSubscriptionFeed,
    })

    const feed = data?.data || []

    return (
        <div className="px-4 py-6 lg:px-8 max-w-6xl">
            <div className="flex items-center gap-3 mb-6">
                <Compass className="h-7 w-7 text-foreground" />
                <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)}
                </div>
            ) : feed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                    <Compass className="h-16 w-16 text-muted-foreground/30" />
                    <p className="text-muted-foreground">You haven't subscribed to anyone yet,<br />or they haven't uploaded videos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {feed.map(video => (
                        <VideoCard key={video.id} video={video} />
                    ))}
                </div>
            )}
        </div>
    )
}
