import { useSearchParams } from "react-router-dom"
import { useState, useEffect } from "react"
import { Loader2, Check } from "lucide-react"
import { cn } from "@/utils"
import { scrapeChannel } from "@/api/videosApi"
import { useUser } from "@clerk/clerk-react"
import { isSubscribed, toggleSubscription } from "@/api/userApi"
import { useMutation, useQueryClient } from "@tanstack/react-query"


export function SearchPage() {
    const [searchParams] = useSearchParams()
    const query = searchParams.get("q") || ""
    const queryClient = useQueryClient()
    const [searchResults, setSearchResults] = useState([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState(null)
    const { user } = useUser()
    const [localSubscriptions, setLocalSubscriptions] = useState(new Set())

    const toggleSubscriptionMutation = useMutation({
        mutationFn: (youtuberId) => toggleSubscription(youtuberId, user?.id),
        onSuccess: (data, youtuberId) => {
            // Update local state
            setLocalSubscriptions(prev => {
                const newSet = new Set(prev)
                if (data.isSubscribed) {
                    newSet.add(youtuberId)
                } else {
                    newSet.delete(youtuberId)
                }
                return newSet
            })
            // Invalidate and refetch subscription queries
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
            queryClient.invalidateQueries({ queryKey: ['subscription_feed'] })
        }
    })

    const handleToggle = (youtuberId) => {
        toggleSubscriptionMutation.mutate(youtuberId)
    }

    // Initialize local subscriptions from localStorage
    useEffect(() => {
        const subs = new Set(searchResults.map(r => r.id).filter(id => isSubscribed(id)))
        setLocalSubscriptions(subs)
    }, [searchResults])



    if (!user) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
                <div className="text-center py-20 text-muted-foreground">
                    You are not signed in.
                </div>
            </div>
        )
    }

    useEffect(() => {
        if (!query.trim()) return

        const search = async () => {
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

                    setSearchResults([result])
                } else {
                    setSearchError("No channel found for this query.")
                }
            } catch (err) {
                setSearchError(
                    err.response?.data?.message ||
                    "Error connecting to search service."
                )
                console.error(err)
            } finally {
                setIsSearching(false)
            }
        }

        search()
    }, [query])

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">

            {/* Loading */}
            {isSearching && (
                <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            )}

            {/* Error */}
            {searchError && (
                <div className="text-center text-red-500 py-10">
                    {searchError}
                </div>
            )}

            {/* Empty */}
            {!isSearching && !searchResults.length && query && (
                <div className="text-center py-20 text-muted-foreground">
                    No results found for "{query}"
                </div>
            )}

            {/* Results */}
            <div className="space-y-4 min-h-[60vh]">
                {searchResults.map(result => {
                    const subscribed = localSubscriptions.has(result.id)

                    return (
                        <div
                            key={result.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center gap-6 rounded-lg border p-6 bg-card"
                        >
                            {/* Avatar */}
                            <img
                                src={result.avatar}
                                alt={result.name}
                                className="h-28 w-28 rounded-full object-cover flex-shrink-0"
                            />

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-lg font-semibold truncate">
                                    {result.name}
                                </p>

                                <p className="text-sm text-muted-foreground mt-1">
                                    {result.subscribers}
                                </p>

                                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                                    {result.description}
                                </p>
                            </div>

                            {/* Subscribe */}
                            <button
                                onClick={() => handleToggle(result.id)}
                                disabled={toggleSubscriptionMutation.isPending}
                                className={cn(
                                    'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
                                    subscribed
                                        ? 'bg-[#e5e7eb] text-foreground hover:bg-[#d1d5db]'
                                        : 'bg-[#FF0000] text-white hover:bg-[#cc0000]'
                                )}
                            >
                                {toggleSubscriptionMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : subscribed ? (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Subscribed
                                    </>
                                ) : (
                                    'Subscribe'
                                )}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}