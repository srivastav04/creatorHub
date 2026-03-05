import { useEffect, useRef } from 'react'

/**
 * Calls `onIntersect` when the sentinel element becomes visible.
 * Used for infinite scroll.
 */
export function useInfiniteScroll(onIntersect, { enabled = true, threshold = 0.1 } = {}) {
    const sentinelRef = useRef(null)

    useEffect(() => {
        if (!enabled || !sentinelRef.current) return
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    onIntersect()
                }
            },
            { threshold }
        )
        observer.observe(sentinelRef.current)
        return () => observer.disconnect()
    }, [onIntersect, enabled, threshold])

    return { sentinelRef }
}
