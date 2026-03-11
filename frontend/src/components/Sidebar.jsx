import { data, NavLink, useLocation } from 'react-router-dom'
import {
    Home, Compass, History, ListVideo, ThumbsUp,
    ChevronLeft, ChevronRight, Video
} from 'lucide-react'
import { cn } from '@/utils'
import { useQuery } from '@tanstack/react-query'
import { getSubscriptions } from '@/api/userApi'

const NAV_ITEMS = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/subscriptions', icon: Compass, label: 'Subscriptions' },
    { to: '/history', icon: History, label: 'History' },
    { to: '/playlists', icon: ListVideo, label: 'Playlists' },
    { to: '/liked', icon: ThumbsUp, label: 'Liked Videos' },
]

export function Sidebar({ isOpen, onClose }) {
    const location = useLocation()

    const { data: subData } = useQuery({
        queryKey: ['subscriptions'],
        queryFn: getSubscriptions,
    })
    const subscriptions = subData?.data || []
    console.log(subscriptions);


    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar panel */}
            <aside
                className={cn(
                    'fixed left-0 top-14 z-30 flex h-[calc(100vh-56px)] flex-col overflow-y-auto border-r border-border/50 bg-background transition-all duration-300',
                    isOpen ? 'w-60' : 'w-0 lg:w-[72px]',
                    'scrollbar-thin'
                )}
            >
                <div className="flex flex-col gap-1 p-2">
                    {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-accent text-foreground'
                                        : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                                    !isOpen && 'lg:justify-center lg:px-0'
                                )
                            }
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className={cn('truncate', !isOpen && 'lg:hidden')}>
                                {label}
                            </span>
                        </NavLink>
                    ))}
                </div>

                {/* Subscriptions section */}
                {subscriptions.length > 0 && (
                    <div className={cn('mt-2 border-t border-border/50 p-2', !isOpen && 'lg:hidden')}>
                        <p className="mb-2 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                            Subscriptions
                        </p>
                        <div className="flex flex-col gap-0.5 max-h-[320px] overflow-y-auto scrollbar-thin hover:scrollbar-thumb-muted-foreground/20">
                            {subscriptions.map(ytber => (
                                <NavLink
                                    key={ytber.id}
                                    to={`/channel/${ytber.id}`}
                                    className={({ isActive }) =>
                                        cn(
                                            'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200',
                                            isActive
                                                ? 'bg-accent text-foreground font-semibold shadow-sm'
                                                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                                        )
                                    }
                                >
                                    <img
                                        src={ytber.avatar}
                                        alt={ytber.name}
                                        className="h-6 w-6 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-border/50"
                                    />
                                    <span className="truncate">{ytber.name}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                )}


                <div className="mt-auto p-3 text-center">
                    <p className={cn('text-[10px] text-muted-foreground/50', !isOpen && 'lg:hidden')}>
                        © 2025 YouTubeClone
                    </p>
                </div>
            </aside>
        </>
    )
}
