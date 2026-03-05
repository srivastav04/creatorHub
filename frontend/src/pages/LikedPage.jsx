import { useQuery } from '@tanstack/react-query'
import { getLikedVideos } from '@/api/userApi'
import { VideoCard } from '@/components/VideoCard'
import { VideoCardSkeleton } from '@/components/Skeleton'
import { ThumbsUp } from 'lucide-react'

export function LikedPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['liked_videos'],
        queryFn: getLikedVideos,
    })

    const liked = data?.data || []

    return (
        <div className="px-4 py-6 lg:px-8 max-w-6xl">
            <div className="flex items-center gap-3 mb-6">
                <ThumbsUp className="h-7 w-7 text-foreground" />
                <h1 className="text-2xl font-bold text-foreground">Liked Videos</h1>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)}
                </div>
            ) : liked.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                    <ThumbsUp className="h-16 w-16 text-muted-foreground/30" />
                    <p className="text-muted-foreground">Videos you like will appear here</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {liked.map(video => (
                        <VideoCard key={video.id} video={video} />
                    ))}
                </div>
            )}
        </div>
    )
}
