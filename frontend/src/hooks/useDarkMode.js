import { useState, useEffect } from 'react'

const DARK_KEY = 'yt_dark_mode'

export function useDarkMode() {
    const [isDark, setIsDark] = useState(() => {
        const stored = localStorage.getItem(DARK_KEY)
        if (stored !== null) return stored === 'true'
        return window.matchMedia('(prefers-color-scheme: dark)').matches
    })

    useEffect(() => {
        const root = document.documentElement
        if (isDark) {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
        localStorage.setItem(DARK_KEY, String(isDark))
    }, [isDark])

    const toggleDark = () => setIsDark(prev => !prev)

    return { isDark, toggleDark }
}
