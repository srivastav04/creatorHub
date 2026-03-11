import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { UserButton, useUser } from '@clerk/clerk-react'
import { Search, Menu, Bell, Sun, Moon, X, ArrowLeft } from 'lucide-react'
import { useDarkMode } from '@/hooks/useDarkMode'
import { cn } from '@/utils'

export function Topbar({ onMenuClick, isSidebarOpen }) {
    const { isDark, toggleDark } = useDarkMode()
    const { user } = useUser()
    const [searchQuery, setSearchQuery] = useState('')
    const [searchFocused, setSearchFocused] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()
    const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(false)
    const inputRef = useRef(null)

    // Sync input with URL when navigating
    useEffect(() => {
        const q = new URLSearchParams(location.search).get('q') || ''
        setSearchQuery(q)
    }, [location.search])

    const handleSearch = (e) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            setIsMobileSearchVisible(false)
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
            inputRef.current?.blur()
        }
    }

    const cancelSearch = (e) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        setSearchQuery('')
        setIsMobileSearchVisible(false)
        if (location.pathname === '/search') {
            navigate('/home', { replace: true })
        }
    }

    const toggleMobileSearch = () => {
        setIsMobileSearchVisible(true)
        // Short delay to ensure the input is mounted before focusing
        setTimeout(() => inputRef.current?.focus(), 50)
    }

    return (
        <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-between justify-between gap-4 border-b border-border/50 bg-background/95 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
            {/* Left: hamburger + logo */}
            {!isMobileSearchVisible && (
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={onMenuClick}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label="Toggle sidebar"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    <Link to="/home" className="flex items-center gap-1.5 hover:opacity-90 transition-opacity">
                        <span className="text-base font-bold tracking-tight text-foreground hidden sm:block">
                            Creator Hub
                        </span>
                    </Link>
                </div>
            )}

            {/* Center: search */}
            <form
                onSubmit={handleSearch}
                className={cn(
                    'flex flex-1 items-center transition-all duration-200',
                    isMobileSearchVisible
                        ? 'fixed inset-0 z-50 flex bg-background px-4'
                        : 'hidden sm:flex max-w-xl',
                    searchFocused && !isMobileSearchVisible ? 'max-w-2xl' : ''
                )}
            >
                {isMobileSearchVisible && (
                    <button
                        type="button"
                        onClick={cancelSearch}
                        className="mr-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                )}
                <div className={cn(
                    'flex flex-1 items-center overflow-hidden rounded-full border transition-colors',
                    searchFocused || isMobileSearchVisible
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
                        onBlur={() => {
                            // Small delay ensures onClick fires before the layout shifts or re-renders
                            setTimeout(() => setSearchFocused(false), 200)
                        }}
                        className="h-9 sm:h-10 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={cancelSearch}
                            className="px-3 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        type="submit"
                        className="flex h-9 sm:h-10 w-12 items-center justify-center border-l border-border bg-muted/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                </div>
            </form>

            {/* Right: actions + user */}
            {!isMobileSearchVisible && (
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    {/* Search button for mobile */}
                    <button
                        onClick={toggleMobileSearch}
                        className="sm:hidden flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label="Search"
                    >
                        <Search className="h-5 w-5" />
                    </button>

                    {/* Dark mode toggle */}
                    <button
                        onClick={toggleDark}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label="Toggle dark mode"
                    >
                        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
            )}
        </header>
    )
}
