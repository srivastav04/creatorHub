import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { saveSubscriptions } from '@/api/userApi'
import YOUTUBERS from '@/data/youtubers'
import { useUser } from '@clerk/clerk-react'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/utils'

export function SetupPage() {
    const [selected, setSelected] = useState([]) // array of ids
    const [selectedDetails, setSelectedDetails] = useState({}) // id -> meta {id,name,avatar,subscribers}
    const [query, setQuery] = useState('')
    const [searchResults, setSearchResults] = useState([]) // dummy search results
    const navigate = useNavigate()
    const { user } = useUser()

    const setupMutation = useMutation({
        mutationFn: saveSubscriptions,
        onSuccess: () => navigate('/home'),
    })

    // Utility to get metadata for an id from known sources
    const findMetaById = (id) => {
        return (
            YOUTUBERS.find(y => y.id === id) ||
            searchResults.find(y => y.id === id) || {
                id,
                name: id,
                avatar: YOUTUBERS[0]?.avatar || '/placeholder.png',
                subscribers: '',
            }
        )
    }

    const toggleYoutuber = (id, meta = null) => {
        setSelected(prev => {
            const exists = prev.includes(id)
            let next
            if (exists) {
                next = prev.filter(s => s !== id)
                // remove from details
                setSelectedDetails(prevMap => {
                    const { [id]: _, ...rest } = prevMap
                    return rest
                })
            } else {
                next = [...prev, id]
                // add to details (use provided meta if available, else find)
                const data = meta || findMetaById(id)
                setSelectedDetails(prevMap => ({ ...prevMap, [id]: data }))
            }
            return next
        })
    }

    const handleContinue = () => {
        if (!user) return
        setupMutation.mutate({ clerkId: user.id, subscriptions: selected })
    }

    const handleSkip = () => {
        if (!user) return
        setupMutation.mutate({ clerkId: user.id, subscriptions: [] })
    }

    // --- Search (dummy) ---
    const handleSearchSubmit = (e) => {
        e.preventDefault()
        if (!query.trim()) return

        // build a dummy result; keep deterministic-ish id so it can be selected and preserved
        const id = `search_${query.trim().toLowerCase().replace(/\s+/g, '_')}`
        const dummy = {
            id,
            name: query.trim(),
            avatar: YOUTUBERS[0]?.avatar || '/placeholder.png',
            subscribers: '1.2M',
            description: 'This is a dummy channel returned for the search query.',
        }

        // if already selected, ensure selectedDetails contains it
        if (selected.includes(id)) {
            setSelectedDetails(prev => ({ ...prev, [id]: dummy }))
        }

        setSearchResults([dummy])
    }

    const clearSearch = () => {
        setQuery('')
        // keep searchResults metadata in selectedDetails if user had selected it
        // but remove searchResults UI
        setSearchResults([])
    }

    // Inline SelectedYoutubers component that reads from selectedDetails
    const SelectedYoutubers = () => {
        const items = Object.values(selectedDetails)
        if (items.length === 0) return null

        return (
            <div className="my-4 mx-auto max-w-4xl px-4 sm:px-0">
                <div className="flex items-center gap-3 overflow-x-auto py-2">
                    {items.map(item => (
                        <div
                            key={item.id}
                            className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1"
                        >
                            <img
                                src={item.avatar}
                                alt={item.name}
                                className="h-8 w-8 rounded-full object-cover"
                            />
                            <span className="text-sm font-medium truncate max-w-[140px]">{item.name}</span>
                            <button
                                onClick={() => toggleYoutuber(item.id)}
                                className="ml-2 text-xs text-muted-foreground px-2 py-1 rounded hover:bg-muted/60"
                                aria-label={`Remove ${item.name}`}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header with title, search, actions */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-4 sm:px-8">
                <div className="mx-auto max-w-4xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="w-full md:w-auto">
                        <h1 className="text-2xl font-semibold text-foreground">Choose your interests</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Select channels you'd like to follow.
                            {selected.length > 0 && (
                                <span className="ml-2 text-red-600 font-medium">{selected.length} selected</span>
                            )}
                        </p>
                    </div>

                    {/* Search form: centered on medium+, full-width on small */}
                    <form onSubmit={handleSearchSubmit} className="w-full md:max-w-lg">
                        <div className="relative">
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search channels (dummy)"
                                className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-400"
                                aria-label="Search channels"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSkip}
                            type="button"
                            className="rounded-full px-3 py-2 text-sm font-medium bg-transparent hover:bg-muted/50 text-foreground/90 transition"
                            aria-label="Skip"
                        >
                            Skip
                        </button>

                        <button
                            onClick={handleContinue}
                            disabled={selected.length === 0 || setupMutation.isPending}
                            className={cn(
                                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all',
                                selected.length > 0
                                    ? 'bg-[#FF0000] text-white hover:bg-[#cc0000] shadow-lg shadow-red-500/20'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                            )}
                        >
                            {(setupMutation.isPending || setupMutation.isLoading) && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Continue
                        </button>
                    </div>
                </div>

                {/* Selected youtubers row */}
                <SelectedYoutubers />
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
                <div className="mx-auto max-w-4xl">
                    {/* If there are active search results -> render them in full area */}
                    {searchResults.length > 0 ? (
                        <div className="space-y-4 min-h-[60vh]">
                            {searchResults.map(result => {
                                const isSelected = selected.includes(result.id)
                                return (
                                    <div
                                        key={result.id}
                                        className="flex flex-col sm:flex-row items-start sm:items-center gap-6 rounded-lg border p-6 bg-card"
                                    >
                                        {/* big avatar left */}
                                        <img
                                            src={result.avatar}
                                            alt={result.name}
                                            className="h-28 w-28 rounded-full object-cover flex-shrink-0"
                                        />

                                        {/* name & meta */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-lg font-semibold text-foreground truncate">{result.name}</p>
                                            <p className="text-sm text-muted-foreground mt-1">{result.subscribers}</p>
                                            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{result.description}</p>
                                        </div>

                                        {/* subscribe button on right */}
                                        <div className="flex-shrink-0 self-stretch sm:self-auto flex items-center">
                                            <button
                                                onClick={() => toggleYoutuber(result.id, result)}
                                                className={cn(
                                                    'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
                                                    isSelected
                                                        ? 'bg-[#e5e7eb] text-foreground hover:bg-[#d1d5db]'
                                                        : 'bg-[#FF0000] text-white hover:bg-[#cc0000]'
                                                )}
                                                aria-pressed={isSelected}
                                                aria-label={isSelected ? `Unsubscribe ${result.name}` : `Subscribe ${result.name}`}
                                            >
                                                {isSelected ? (
                                                    <>
                                                        <Check className="h-4 w-4" />
                                                        Subscribed
                                                    </>
                                                ) : (
                                                    'Subscribe'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        /* Default grid (only 5 youtubers shown) */
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {YOUTUBERS.slice(0, 5).map(ytber => {
                                const isSelected = selected.includes(ytber.id)
                                return (
                                    <button
                                        key={ytber.id}
                                        onClick={() => toggleYoutuber(ytber.id, ytber)}
                                        aria-pressed={isSelected}
                                        className={cn(
                                            'relative flex items-center gap-4 rounded-lg border p-3 text-left transition-all duration-150',
                                            isSelected
                                                ? 'border-[#FF0000] bg-[#FF0000]/5 shadow-md shadow-red-500/8 transform scale-[1.01]'
                                                : 'border-border bg-card hover:shadow hover:-translate-y-0.5'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border transition-all',
                                                isSelected ? 'border-[#FF0000] bg-[#FF0000]' : 'border-border bg-transparent'
                                            )}
                                        >
                                            {isSelected && <Check className="h-3 w-3 text-white stroke-[3]" />}
                                        </div>

                                        <img
                                            src={ytber.avatar}
                                            alt={ytber.name}
                                            className="h-16 w-16 flex-shrink-0 rounded-full object-cover ring-0 transition-all duration-200"
                                            style={isSelected ? { boxShadow: '0 0 0 4px #FF000033' } : {}}
                                            loading="lazy"
                                        />

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{ytber.name}</p>
                                            <p className="text-[13px] text-muted-foreground mt-1 truncate">{ytber.subscribers}</p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}