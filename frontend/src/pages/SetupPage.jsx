import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { saveSubscriptions } from '@/api/userApi'
import YOUTUBERS from '@/data/youtubers'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/utils'

export function SetupPage() {
    const [selected, setSelected] = useState([])
    const navigate = useNavigate()

    const setupMutation = useMutation({
        mutationFn: saveSubscriptions,
        onSuccess: () => navigate('/home'),
    })

    const toggleYoutuber = (id) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        )
    }

    const handleContinue = () => {
        //if (selected.length === 0) return
        setupMutation.mutate(selected)
    }

    // New: Skip logic - navigates without saving subscriptions
    const handleSkip = () => {
        // optional: you could track analytics here before navigating
        navigate('/home')
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-4 sm:px-8">
                <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

                    <div>
                        <h1 className="text-2xl font-semibold text-foreground">
                            Choose your interests
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Select channels you'd like to follow.
                            {selected.length > 0 && (
                                <span className="ml-2 text-red-600 font-medium">
                                    {selected.length} selected
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-nowrap">

                        <button
                            onClick={handleSkip}
                            type="button"
                            className="flex-1 sm:flex-none rounded-full px-3 py-2 text-sm font-medium bg-transparent hover:bg-muted/50 text-foreground/90 transition"
                            aria-label="Skip"
                        >
                            Skip
                        </button>

                        <button
                            onClick={handleContinue}
                            disabled={selected.length === 0 || setupMutation.isPending}
                            className={cn(
                                "flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all",
                                selected.length > 0
                                    ? "bg-[#FF0000] text-white hover:bg-[#cc0000] shadow-lg shadow-red-500/20"
                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                            )}
                        >
                            {(setupMutation.isPending || setupMutation.isLoading) && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            Continue
                        </button>

                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
                <div className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-3 gap-4">
                    {YOUTUBERS.map(ytber => {
                        const isSelected = selected.includes(ytber.id)

                        return (
                            <button
                                key={ytber.id}
                                onClick={() => toggleYoutuber(ytber.id)}
                                aria-pressed={isSelected}
                                className={cn(
                                    'relative flex items-center gap-4 rounded-lg border p-3 text-left transition-all duration-150',
                                    // YouTube-like card: light background, subtle shadow, hover lift
                                    isSelected
                                        ? 'border-[#FF0000] bg-[#FF0000]/5 shadow-md shadow-red-500/8 transform scale-[1.01]'
                                        : 'border-border bg-card hover:shadow hover:translate-y-[-2px]'
                                )}
                            >
                                {/* Checkmark */}
                                <div
                                    className={cn(
                                        'absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border transition-all',
                                        isSelected ? 'border-[#FF0000] bg-[#FF0000]' : 'border-border bg-transparent'
                                    )}
                                >
                                    {isSelected && <Check className="h-3 w-3 text-white stroke-[3]" />}
                                </div>

                                {/* Left: Avatar */}
                                <img
                                    src={ytber.avatar}
                                    alt={ytber.name}
                                    className={cn(
                                        'h-16 w-16 flex-shrink-0 rounded-full object-cover ring-0 transition-all duration-200'
                                    )}
                                    style={isSelected ? { boxShadow: '0 0 0 4px #FF000033' } : {}}
                                    loading="lazy"
                                />

                                {/* Right: Name & subs (emphasized) */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">{ytber.name}</p>
                                    <p className="text-[13px] text-muted-foreground mt-1 truncate">{ytber.subscribers}</p>
                                    {/* Removed tags as requested */}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}