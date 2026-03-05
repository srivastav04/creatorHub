import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/clerk-react'
import { getPlaylists, createPlaylist, deletePlaylist } from '@/api/playlistApi'
import { VideoCardSkeleton, Skeleton } from '@/components/Skeleton'
import { ListVideo, Plus, Trash2, X, Loader2, Music2 } from 'lucide-react'
import { cn } from '@/utils'
import { formatTimeAgo } from '@/utils'

export function PlaylistsPage() {
    const queryClient = useQueryClient()
    const { user } = useUser()
    const [showModal, setShowModal] = useState(false)
    const [name, setName] = useState('')

    const { data, isLoading } = useQuery({
        queryKey: ['playlists'],
        queryFn: getPlaylists,
    })

    const createMutation = useMutation({
        mutationFn: (name) => createPlaylist(name, '', user?.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['playlists'] })
            setShowModal(false)
            setName('')
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (playlistId) => deletePlaylist(playlistId, user?.id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['playlists'] }),
    })

    const playlists = data?.data || []

    return (
        <div className="px-4 py-6 lg:px-8 max-w-[1800px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <ListVideo className="h-7 w-7 text-foreground" />
                    <h1 className="text-2xl font-bold text-foreground">Playlists</h1>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 rounded-full bg-[#FF0000] px-4 py-2 text-sm font-semibold text-white hover:bg-[#CC0000] transition-colors shadow-md shadow-red-500/20"
                >
                    <Plus className="h-4 w-4" />
                    New playlist
                </button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-48 rounded-2xl" />
                    ))}
                </div>
            ) : playlists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                    <ListVideo className="h-16 w-16 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No playlists yet</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                    >
                        Create your first playlist
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {playlists.map(pl => (
                        <div key={pl.id} className="group relative rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-border transition-colors">
                            {/* Thumbnail stack */}
                            <Link to={`/playlists/${pl.id}`}>
                                <div className="relative h-44 bg-muted flex items-center justify-center">
                                    {pl.videos.length > 0 ? (
                                        <img
                                            src={pl.videos[0].thumbnail}
                                            alt={pl.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <ListVideo className="h-12 w-12 text-muted-foreground/30" />
                                    )}
                                    <div className="absolute bottom-0 right-0 m-2 rounded-lg bg-black/70 px-2 py-1 text-xs font-semibold text-white">
                                        {pl.videos.length} videos
                                    </div>
                                </div>
                            </Link>

                            {/* Info */}
                            <div className="p-4">
                                <h3 className="font-semibold text-foreground line-clamp-1">{pl.name}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Updated {formatTimeAgo(pl.updatedAt)}
                                </p>
                            </div>

                            {/* Delete button */}
                            <button
                                onClick={() => deleteMutation.mutate(pl.id)}
                                className="absolute right-3 top-3 hidden h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow backdrop-blur hover:bg-background hover:text-destructive group-hover:flex transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Create playlist modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-foreground">New Playlist</h3>
                            <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Playlist name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && name.trim() && createMutation.mutate(name.trim())}
                            autoFocus
                            className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => name.trim() && createMutation.mutate(name.trim())}
                                disabled={!name.trim() || createMutation.isPending}
                                className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                {createMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
