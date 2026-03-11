import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, SignIn, useUser } from '@clerk/clerk-react'
import { Loader2 } from 'lucide-react'

import { AppLayout } from '@/layouts/AppLayout'
import { HomePage } from '@/pages/HomePage'
import { WatchPage } from '@/pages/WatchPage'
import { SetupPage } from '@/pages/SetupPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { PlaylistsPage } from '@/pages/PlaylistsPage'
import { PlaylistDetailPage } from '@/pages/PlaylistDetailPage'
import { LikedPage } from '@/pages/LikedPage'
import { SubscriptionsPage } from '@/pages/SubscriptionsPage'
import { SearchPage } from '@/pages/SearchPage'

import { isSetupComplete, verifyUser } from '@/api/userApi'

// Protects routes that require authentication
function AuthGuard({ children }) {
    const { user, isLoaded } = useUser();
    const [isVerifying, setIsVerifying] = useState(true);

    useEffect(() => {
        if (isLoaded && user) {
            verifyUser(user.id).finally(() => setIsVerifying(false));
        } else if (isLoaded && !user) {
            setIsVerifying(false);
        }
    }, [isLoaded, user]);

    if (!isLoaded || (user && isVerifying)) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <>
            <SignedIn>{children}</SignedIn>
            <SignedOut>
                <Navigate to="/sign-in" replace />
            </SignedOut>
        </>
    )

}

// Enforces the Setup Page flow
function SetupGuard({ children }) {
    const complete = isSetupComplete()
    if (!complete) {
        return <Navigate to="/setup" replace />
    }
    return children
}

// Redirects logged-in users away from /sign-in and /setup (if already done)
function RedirectIfAuth({ to }) {
    const { user, isLoaded } = useUser();
    const [isVerifying, setIsVerifying] = useState(true);

    useEffect(() => {
        if (isLoaded && user) {
            verifyUser(user.id).finally(() => setIsVerifying(false));
        } else if (isLoaded && !user) {
            setIsVerifying(false);
        }
    }, [isLoaded, user]);

    if (!isLoaded || (user && isVerifying)) {
        return null;
    }

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
                        <RedirectIfAuth />
                        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-in" />
                    </div>
                }
            />

            {/* Setup phase */}
            <Route
                path="/setup"
                element={
                    <AuthGuard>
                        {isSetupComplete() ? <Navigate to="/home" replace /> : <SetupPage />}
                    </AuthGuard>
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
                <Route path="/search" element={<SearchPage />} />
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
