import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { saveSubscriptions } from '@/api/userApi'
import { scrapeChannel, subscribeChannel } from '@/api/videosApi'
import YOUTUBERS from '@/data/youtubers'
import { useUser } from '@clerk/clerk-react'
import { Check, Loader2, AlertCircle, X } from 'lucide-react'
import { cn } from '@/utils'

// ─── Full-page loading overlay ────────────────────────────────────────────
function SetupLoadingOverlay() {
    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
        >
            <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
                {/* Outer ring */}
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-20" />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#FF0000]/10">
                    <Loader2 className="h-8 w-8 animate-spin text-[#FF0000]" />
                </span>
            </div>
            <p className="text-lg font-semibold text-foreground">Saving your preferences…</p>
            <p className="mt-1 text-sm text-muted-foreground">Setting up your personalised feed</p>
        </div>
    )
}

// ─── Toast notification ───────────────────────────────────────────────────
function ErrorToast({ message, onDismiss }) {
    return (
        <div
            role="alert"
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-lg dark:border-red-900 dark:bg-red-950 animate-in fade-in slide-in-from-bottom-4"
        >
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">{message}</span>
            <button
                onClick={onDismiss}
                className="ml-2 rounded p-0.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900"
                aria-label="Dismiss error"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}

// ─── SetupPage ────────────────────────────────────────────────────────────
export function SetupPage() {
    const [selected, setSelected] = useState([])            // array of ids
    const [selectedDetails, setSelectedDetails] = useState({})  // id → meta
    const [query, setQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState(null)
    const [setupError, setSetupError] = useState(null)      // backend error toast
    const navigate = useNavigate()
    const { user } = useUser()

    const setupMutation = useMutation({
        mutationFn: saveSubscriptions,
        onSuccess: () => navigate('/home'),
        onError: (err) => {
            const msg =
                err?.response?.data?.error ||
                err?.message ||
                'Something went wrong. Please try again.'
            setSetupError(msg)
        },
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
                setSelectedDetails(prevMap => {
                    const { [id]: _, ...rest } = prevMap
                    return rest
                })
            } else {
                next = [...prev, id]
                const data = meta || findMetaById(id)
                setSelectedDetails(prevMap => ({ ...prevMap, [id]: data }))

                // If this channel came from a live search result (not the default
                // grid), persist it and pre-fetch its latest 15 videos right away.
                const isSearchResult = searchResults.some(r => r.id === id)
                if (isSearchResult) {
                    subscribeChannel(id).catch(err =>
                        console.warn('[SetupPage] subscribeChannel fire-and-forget failed:', err.message)
                    )
                }
            }
            return next
        })
    }

    const handleContinue = () => {
        if (!user) return
        setSetupError(null)
        setupMutation.mutate({
            clerkId: user.id,
            subscriptions: selected,
            email: user.primaryEmailAddress?.emailAddress || null,
        })
    }

    const handleSkip = () => {
        if (!user) return
        setSetupError(null)
        setupMutation.mutate({
            clerkId: user.id,
            subscriptions: [],
            email: user.primaryEmailAddress?.emailAddress || null,
        })
    }

    // --- Search (Real Scraping) ---
    const handleSearchSubmit = async (e) => {
        e.preventDefault()
        if (!query.trim()) return

        setIsSearching(true)
        setSearchError(null)

        try {
            const data = await scrapeChannel(query.trim())
            if (data) {
                const result = {
                    id: data.channelId,
                    name: data.channelName,
                    avatar: data.avatar,
                    subscribers: data.subscribers,
                    description: data.description
                }

                if (selected.includes(result.id)) {
                    setSelectedDetails(prev => ({ ...prev, [result.id]: result }))
                }

                setSearchResults([result])
            } else {
                setSearchError('No channel found for this query.')
            }
        } catch (err) {
            setSearchError(err.response?.data?.message || 'Error connecting to search service.')
            console.error('Search error:', err)
        } finally {
            setIsSearching(false)
        }
    }

    const clearSearch = () => {
        setQuery('')
        setSearchError(null)
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

    const isSaving = setupMutation.isPending || setupMutation.isLoading

    return (
        <>
            {/* Full-page loading overlay while backend save is in flight */}
            {isSaving && <SetupLoadingOverlay />}

            {/* Error toast from backend */}
            {setupError && (
                <ErrorToast
                    message={setupError}
                    onDismiss={() => setSetupError(null)}
                />
            )}

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

                        {/* Search form */}
                        <form onSubmit={handleSearchSubmit} className="w-full md:max-w-lg">
                            <div className="relative">
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search channels (e.g. MrBeast)"
                                    className="w-full rounded-full border border-border bg-card px-4 py-2 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
                                    aria-label="Search channels"
                                    disabled={isSearching || isSaving}
                                />
                                {isSearching ? (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                ) : query && (
                                    <button
                                        type="button"
                                        onClick={clearSearch}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-foreground"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </form>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSkip}
                                type="button"
                                disabled={isSaving}
                                className="rounded-full px-3 py-2 text-sm font-medium bg-transparent hover:bg-muted/50 text-foreground/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Skip"
                            >
                                Skip
                            </button>

                            <button
                                onClick={handleContinue}
                                disabled={selected.length === 0 || isSaving}
                                className={cn(
                                    'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all',
                                    selected.length > 0 && !isSaving
                                        ? 'bg-[#FF0000] text-white hover:bg-[#cc0000] shadow-lg shadow-red-500/20'
                                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                                )}
                                aria-label="Continue"
                            >
                                {isSaving && (
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
                        {/* Search error */}
                        {searchError && (
                            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <span className="flex-1">{searchError}</span>
                                <button onClick={() => setSearchError(null)} className="text-red-400 hover:text-red-600">✕</button>
                            </div>
                        )}

                        {/* Search results */}
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
                            /* Default grid */
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
        </>
    )
}