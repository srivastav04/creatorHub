import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Topbar } from '@/components/Topbar'
import { Sidebar } from '@/components/Sidebar'
import { cn } from '@/utils'

export function AppLayout() {
    // Start closed on mobile, open on desktop
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024)
    const location = useLocation()

    // Close sidebar on route change (for mobile)
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false)
        }
    }, [location.pathname])

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev)

    return (
        <div className="min-h-screen bg-background">
            <Topbar onMenuClick={toggleSidebar} isSidebarOpen={isSidebarOpen} />

            <div className="flex pt-14">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

                {/* Main content area */}
                <main
                    className={cn(
                        'flex-1 transition-all duration-300 min-w-0',
                        isSidebarOpen ? 'lg:ml-60' : 'lg:ml-[72px]'
                    )}
                >
                    <div className="min-h-[calc(100vh-56px)]">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
