import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/clerk-react'
import { getWatchHistory, clearWatchHistory, removeFromWatchHistory } from '@/api/userApi'
import { VideoCard } from '@/components/VideoCard'
import { VideoCardSkeleton } from '@/components/Skeleton'
import { groupByDate, cn } from '@/utils'
import { History, Trash2, X } from 'lucide-react'

export function HistoryPage() {
    const queryClient = useQueryClient()
    const { user } = useUser()

    const { data, isLoading } = useQuery({
        queryKey: ['history'],
        queryFn: getWatchHistory,
    })

    const clearMutation = useMutation({
        mutationFn: () => clearWatchHistory(user?.id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['history'] }),
    })

    const removeMutation = useMutation({
        mutationFn: (videoId) => removeFromWatchHistory(videoId, user?.id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['history'] }),
    })

    const history = data?.data || []
    const groups = groupByDate(history, 'watchedAt')
    console.log(history);


    return (
        <div className="px-4 py-6 lg:px-8 max-w-[1800px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <History className="h-7 w-7 text-foreground" />
                    <h1 className="text-2xl font-bold text-foreground">Watch History</h1>
                </div>
                {history.length > 0 && (
                    <button
                        onClick={() => clearMutation.mutate()}
                        className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                        Clear all
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex flex-col gap-8">
                    {Array.from({ length: 2 }).map((_, g) => (
                        <div key={g}>
                            <div className="h-5 w-20 bg-muted rounded mb-4 animate-pulse" />
                            <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                                {Array.from({ length: 3 }).map((_, i) => <VideoCardSkeleton key={i} />)}
                            </div>
                        </div>
                    ))}
                </div>
            ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                    <History className="h-16 w-16 text-muted-foreground/30" />
                    <p className="text-muted-foreground">Your watch history is empty</p>
                </div>
            ) : (
                <div className="flex flex-col gap-10">
                    {Object.entries(groups).map(([label, videos]) => (
                        <div key={label}>
                            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{label}</h2>
                            <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                                {videos.map(video => (
                                    <div key={`${video.id}-${video.watchedAt}`} className="relative group">
                                        <VideoCard video={video} />
                                        <button
                                            onClick={() => removeMutation.mutate(video.id)}
                                            className="absolute right-2 top-2 hidden h-7 w-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-background hover:text-destructive group-hover:flex"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
