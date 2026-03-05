import { Link } from 'react-router-dom'
import { formatViews, formatDuration, formatTimeAgo, cn } from '@/utils'

export function VideoCard({ video, className }) {
    if (!video) return null
    return (
        <Link
            to={`/watch/${video.id}`}
            className={cn(
                'group flex flex-col gap-3 hover:no-underline',
                className
            )}
        >
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                />
                {/* Duration badge */}
                <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white">
                    {formatDuration(video.duration)}
                </span>
            </div>

            {/* Meta */}
            <div className="flex gap-3">
                {/* Channel avatar */}
                <Link
                    to={`/channel/${video.channelId}`}
                    onClick={e => e.stopPropagation()}
                    className="mt-0.5 h-9 w-9 shrink-0"
                >
                    <img
                        src={video.channelAvatar}
                        alt={video.channel}
                        className="h-9 w-9 rounded-full object-cover ring-2 ring-transparent transition-colors group-hover:ring-primary/20"
                        loading="lazy"
                    />
                </Link>

                <div className="flex min-w-0 flex-col gap-0.5">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
                        {video.title}
                    </h3>
                    <p className="truncate text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {video.channel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {formatViews(video.views)} · {formatTimeAgo(video.uploadedAt)}
                    </p>
                </div>
            </div>
        </Link>
    )
}
