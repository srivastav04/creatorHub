import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Topbar } from '@/components/Topbar'
import { Sidebar } from '@/components/Sidebar'
import { cn } from '@/utils'

export function AppLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)

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
