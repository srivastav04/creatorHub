import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Manages all video player state and keyboard shortcuts.
 * Returns player state and handlers to attach to a <video> element.
 */
export function useVideoPlayer(videoRef, containerRef) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [volume, setVolume] = useState(1)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isTheater, setIsTheater] = useState(false)
    const [isMiniPlayer, setIsMiniPlayer] = useState(false)
    const [showControls, setShowControls] = useState(true)
    const controlsTimerRef = useRef(null)

    // ---- Playback ----
    const togglePlay = useCallback(() => {
        const video = videoRef.current
        if (!video) return
        if (video.paused) {
            video.play()
            setIsPlaying(true)
        } else {
            video.pause()
            setIsPlaying(false)
        }
    }, [videoRef])

    // ---- Mute ----
    const toggleMute = useCallback(() => {
        const video = videoRef.current
        if (!video) return
        video.muted = !video.muted
        setIsMuted(video.muted)
    }, [videoRef])

    // ---- Volume ----
    const handleVolumeChange = useCallback((val) => {
        const video = videoRef.current
        if (!video) return
        video.volume = val
        setVolume(val)
        setIsMuted(val === 0)
    }, [videoRef])

    // ---- Seek ----
    const handleSeek = useCallback((val) => {
        const video = videoRef.current
        if (!video) return
        video.currentTime = (val / 100) * video.duration
    }, [videoRef])

    // ---- Fullscreen ----
    const toggleFullscreen = useCallback(() => {
        const container = containerRef?.current || videoRef.current?.closest('.video-container')
        if (!container) return

        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`)
            })
        } else {
            document.exitFullscreen()
        }
    }, [videoRef, containerRef])

    // Sync fullscreen state with browser
    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }
        document.addEventListener('fullscreenchange', onFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
    }, [])

    // ---- Theater ----
    const toggleTheater = useCallback(() => {
        setIsTheater(prev => !prev)
        setIsMiniPlayer(false)
    }, [])

    // ---- Mini Player ----
    const toggleMiniPlayer = useCallback(() => {
        setIsMiniPlayer(prev => !prev)
        setIsTheater(false)
    }, [])

    // ---- Video events ----
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const onTimeUpdate = () => {
            setCurrentTime(video.currentTime)
            setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0)
        }
        const onLoadedMetadata = () => setDuration(video.duration)
        const onPlay = () => setIsPlaying(true)
        const onPause = () => setIsPlaying(false)
        const onEnded = () => setIsPlaying(false)

        video.addEventListener('timeupdate', onTimeUpdate)
        video.addEventListener('loadedmetadata', onLoadedMetadata)
        video.addEventListener('play', onPlay)
        video.addEventListener('pause', onPause)
        video.addEventListener('ended', onEnded)

        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate)
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('play', onPlay)
            video.removeEventListener('pause', onPause)
            video.removeEventListener('ended', onEnded)
        }
    }, [videoRef])

    // ---- Keyboard shortcuts ----
    useEffect(() => {
        const onKeyDown = (e) => {
            // Ignore if user is typing in an input
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
            switch (e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault()
                    togglePlay()
                    break
                case 'm':
                    e.preventDefault()
                    toggleMute()
                    break
                case 'f':
                    e.preventDefault()
                    toggleFullscreen()
                    break
                case 't':
                    e.preventDefault()
                    toggleTheater()
                    break
                default:
                    break
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [togglePlay, toggleMute, toggleFullscreen, toggleTheater])

    // ---- Controls auto-hide ----
    const resetControlsTimer = useCallback(() => {
        setShowControls(true)
        clearTimeout(controlsTimerRef.current)
        controlsTimerRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false)
        }, 3000)
    }, [isPlaying])

    useEffect(() => {
        return () => clearTimeout(controlsTimerRef.current)
    }, [])

    return {
        isPlaying, isMuted, volume, progress, duration, currentTime,
        isFullscreen, isTheater, isMiniPlayer, showControls,
        togglePlay, toggleMute, handleVolumeChange, handleSeek,
        toggleFullscreen, toggleTheater, toggleMiniPlayer, resetControlsTimer,
    }
}
