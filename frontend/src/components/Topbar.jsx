import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserButton, useUser } from '@clerk/clerk-react'
import { Search, Menu, Bell, Sun, Moon, X, Mic } from 'lucide-react'
import { useDarkMode } from '@/hooks/useDarkMode'
import { cn } from '@/utils'

export function Topbar({ onMenuClick, isSidebarOpen }) {
    const { isDark, toggleDark } = useDarkMode()
    const { user } = useUser()
    const [searchQuery, setSearchQuery] = useState('')
    const [searchFocused, setSearchFocused] = useState(false)
    const navigate = useNavigate()
    const inputRef = useRef(null)

    const handleSearch = (e) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
        }
    }

    return (
        <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-4 border-b border-border/50 bg-background/95 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
            {/* Left: hamburger + logo */}
            <div className="flex items-center gap-3 shrink-0">
                <button
                    onClick={onMenuClick}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Toggle sidebar"
                >
                    <Menu className="h-5 w-5" />
                </button>

                <Link to="/home" className="flex items-center gap-1.5 hover:opacity-90 transition-opacity">
                    {/* YouTube-like logo */}
                    <div className="flex h-6 w-9 items-center justify-center rounded-md bg-[#FF0000]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white">
                            <path d="M10 15l5.19-3L10 9v6zm11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
                        </svg>
                    </div>
                    <span className="text-base font-bold tracking-tight text-foreground hidden sm:block">
                        YouTube
                    </span>
                </Link>
            </div>

            {/* Center: search */}
            <form
                onSubmit={handleSearch}
                className={cn(
                    'flex flex-1 items-center max-w-xl transition-all duration-200',
                    searchFocused ? 'max-w-2xl' : ''
                )}
            >
                <div className={cn(
                    'flex flex-1 items-center overflow-hidden rounded-full border transition-colors',
                    searchFocused
                        ? 'border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-border bg-muted/40 hover:border-muted-foreground/40'
                )}>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="h-10 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => { setSearchQuery(''); inputRef.current?.focus() }}
                            className="px-3 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        type="submit"
                        className="flex h-10 w-12 items-center justify-center border-l border-border bg-muted/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                </div>
                <button
                    type="button"
                    className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Voice search"
                >
                    <Mic className="h-4 w-4" />
                </button>
            </form>

            {/* Right: actions + user */}
            <div className="flex items-center gap-2 shrink-0">
                {/* Dark mode toggle */}
                <button
                    onClick={toggleDark}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Toggle dark mode"
                >
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                {/* Notifications */}
                <button className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                    <Bell className="h-4 w-4" />
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#FF0000]" />
                </button>

                {/* User button */}
                <div className="ml-1">
                    <UserButton
                        appearance={{
                            elements: {
                                avatarBox: 'h-8 w-8',
                            },
                        }}
                    />
                </div>
            </div>
        </header>
    )
}
