import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/clerk-react'
import { getPlaylistById, removeFromPlaylist } from '@/api/playlistApi'
import { VideoCard } from '@/components/VideoCard'
import { Skeleton, VideoCardSkeleton } from '@/components/Skeleton'
import { formatTimeAgo, formatDuration } from '@/utils'
import { ListVideo, Trash2, ArrowLeft } from 'lucide-react'

export function PlaylistDetailPage() {
    const { id } = useParams()
    const { user } = useUser()
    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery({
        queryKey: ['playlist', id],
        queryFn: () => getPlaylistById(id),
    })

    const removeMutation = useMutation({
        mutationFn: (videoId) => removeFromPlaylist(id, videoId, user?.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['playlist', id] })
            queryClient.invalidateQueries({ queryKey: ['playlists'] })
        },
    })

    const playlist = data?.data

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-4 lg:p-8 lg:flex-row max-w-6xl">
                <Skeleton className="h-64 w-full lg:w-72 shrink-0 rounded-2xl" />
                <div className="flex-1 flex flex-col gap-4">
                    {Array.from({ length: 5 }).map((_, i) => <VideoCardSkeleton key={i} />)}
                </div>
            </div>
        )
    }

    if (!playlist) {
        return (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
                Playlist not found.
            </div>
        )
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-8 max-w-6xl">
            {/* Sidebar info */}
            <div className="w-full lg:w-72 shrink-0">
                <div className="sticky top-20">
                    <Link to="/playlists" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to playlists
                    </Link>

                    {/* Playlist cover */}
                    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-muted flex items-center justify-center">
                        {playlist.videos.length > 0 ? (
                            <img
                                src={playlist.videos[0].thumbnail}
                                alt={playlist.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <ListVideo className="h-12 w-12 text-muted-foreground/30" />
                        )}
                    </div>

                    <h1 className="mt-4 text-xl font-bold text-foreground">{playlist.name}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {playlist.videos.length} video{playlist.videos.length !== 1 ? 's' : ''} · Updated {formatTimeAgo(playlist.updatedAt)}
                    </p>
                </div>
            </div>

            {/* Video list */}
            <div className="flex-1 flex flex-col gap-3">
                {playlist.videos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                        <ListVideo className="h-12 w-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground">This playlist is empty</p>
                        <Link to="/home" className="text-sm font-semibold text-primary hover:underline">
                            Browse videos to add
                        </Link>
                    </div>
                ) : (
                    playlist.videos.map((video, index) => (
                        <div key={`${video.id}-${index}`} className="group flex gap-3 items-center rounded-xl p-2 hover:bg-accent/30 transition-colors">
                            <span className="w-6 text-center text-sm text-muted-foreground shrink-0">{index + 1}</span>
                            <Link to={`/watch/${video.id}`} className="flex gap-3 flex-1 hover:no-underline min-w-0">
                                <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-lg bg-muted">
                                    <img
                                        src={video.thumbnail}
                                        alt={video.title}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                    />
                                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] text-white">
                                        {formatDuration(video.duration)}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <p className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                        {video.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{video.channel}</p>
                                </div>
                            </Link>
                            <button
                                onClick={() => removeMutation.mutate(video.id)}
                                className="hidden group-hover:flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
