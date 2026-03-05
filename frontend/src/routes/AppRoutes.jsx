import { Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'

import { AppLayout } from '@/layouts/AppLayout'
import { HomePage } from '@/pages/HomePage'
import { WatchPage } from '@/pages/WatchPage'
import { SetupPage } from '@/pages/SetupPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { PlaylistsPage } from '@/pages/PlaylistsPage'
import { PlaylistDetailPage } from '@/pages/PlaylistDetailPage'
import { LikedPage } from '@/pages/LikedPage'
import { SubscriptionsPage } from '@/pages/SubscriptionsPage'

import { isSetupComplete } from '@/api/userApi'

// Protects routes that require authentication
function AuthGuard({ children }) {
    // return (
    //     <>
    //         <SignedIn>{children}</SignedIn>
    //         <SignedOut>
    //             <Navigate to="/sign-in" replace />
    //         </SignedOut>
    //     </>
    // )
    return children
}

// Enforces the Setup Page flow
function SetupGuard({ children }) {
    // const complete = isSetupComplete()
    // if (!complete) {
    //     return <Navigate to="/setup" replace />
    // }
    return children
}

// Redirects logged-in users away from /sign-in and /setup (if already done)
function RedirectIfAuth({ to }) {
    const complete = isSetupComplete()
    return (
        <SignedIn>
            <Navigate to={complete ? '/home' : '/setup'} replace />
        </SignedIn>
    )
}

export function AppRoutes() {
    return (
        <Routes>
            {/* Public / Auth routes */}
            <Route
                path="/sign-in/*"
                element={
                    <div className="flex h-screen w-screen items-center justify-center bg-background">
                        {/* <RedirectIfAuth /> */}
                        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-in" />
                    </div>
                }
            />

            {/* Setup phase */}
            <Route
                path="/setup"
                element={
                    // <AuthGuard>
                    //     {isSetupComplete() ? <Navigate to="/home" replace /> : <SetupPage />}
                    // </AuthGuard>
                    <SetupPage />
                }
            />

            {/* Main app (protected) */}
            <Route
                element={
                    <AuthGuard>
                        <SetupGuard>
                            <AppLayout />
                        </SetupGuard>
                    </AuthGuard>
                }
            >
                <Route path="/home" element={<HomePage />} />
                <Route path="/watch/:id" element={<WatchPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/playlists" element={<PlaylistsPage />} />
                <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
                <Route path="/liked" element={<LikedPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                {/* Fallback for unknown routes inside app layout */}
                <Route path="*" element={<Navigate to="/home" replace />} />
            </Route>

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
    )
}
