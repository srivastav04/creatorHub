import { useRef, useState } from 'react'
import { useVideoPlayer } from '@/hooks/useVideoPlayer'
import { formatDuration, cn } from '@/utils'
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    Maximize2, PictureInPicture2, X, Settings
} from 'lucide-react'

export function VideoPlayer({ video, isTheater, onTheaterToggle }) {
    const videoRef = useRef(null)
    const {
        isPlaying, isMuted, volume, progress, duration, currentTime,
        isFullscreen, isMiniPlayer, showControls,
        togglePlay, toggleMute, handleVolumeChange, handleSeek,
        toggleFullscreen, toggleTheater, toggleMiniPlayer, resetControlsTimer,
    } = useVideoPlayer(videoRef)

    const [isDragging, setIsDragging] = useState(false)

    if (!video) return null

    return (
        <>
            {/* Main player */}
            {!isMiniPlayer && (
                <div
                    className={cn(
                        'video-container group relative overflow-hidden bg-black',
                        isTheater ? 'w-full rounded-none' : 'w-full rounded-xl',
                        isFullscreen ? 'fixed inset-0 z-[100] rounded-none' : ''
                    )}
                    onMouseMove={resetControlsTimer}
                    onMouseEnter={resetControlsTimer}
                >
                    <video
                        ref={videoRef}
                        src={video.videoUrl}
                        className="aspect-video w-full cursor-pointer"
                        onClick={togglePlay}
                        playsInline
                        preload="metadata"
                    />

                    {/* Play/Pause overlay on click flash */}
                    <div
                        className={cn(
                            'pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200',
                            isPlaying ? 'opacity-0' : 'opacity-0'
                        )}
                    >
                        <div className="rounded-full bg-black/50 p-5">
                            <Play className="h-10 w-10 text-white fill-white" />
                        </div>
                    </div>

                    {/* Controls overlay */}
                    <div
                        className={cn(
                            'absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300',
                            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
                        )}
                    >
                        {/* Progress bar */}
                        <div className="px-3 pb-1">
                            <div
                                className="group/progress relative flex h-1 cursor-pointer items-center hover:h-3 transition-all duration-150"
                                onClick={e => {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    const pct = ((e.clientX - rect.left) / rect.width) * 100
                                    handleSeek(pct)
                                }}
                            >
                                <div className="h-full w-full rounded-full bg-white/30 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-[#FF0000] transition-none"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div
                                    className="absolute h-3 w-3 rounded-full bg-[#FF0000] opacity-0 group-hover/progress:opacity-100 transition-opacity"
                                    style={{ left: `calc(${progress}% - 6px)` }}
                                />
                            </div>
                        </div>

                        {/* Bottom controls row */}
                        <div className="flex items-center gap-2 px-3 pb-3">
                            {/* Play/Pause */}
                            <button
                                onClick={togglePlay}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
                            >
                                {isPlaying
                                    ? <Pause className="h-5 w-5 fill-white" />
                                    : <Play className="h-5 w-5 fill-white" />
                                }
                            </button>

                            {/* Volume */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={toggleMute}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
                                >
                                    {isMuted || volume === 0
                                        ? <VolumeX className="h-4 w-4" />
                                        : <Volume2 className="h-4 w-4" />
                                    }
                                </button>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={isMuted ? 0 : volume}
                                    onChange={e => handleVolumeChange(Number(e.target.value))}
                                    className="w-20 accent-white cursor-pointer"
                                />
                            </div>

                            {/* Time display */}
                            <span className="text-xs text-white/90 tabular-nums ml-1">
                                {formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}
                            </span>

                            {/* Spacer */}
                            <div className="flex-1" />

                            {/* Keyboard shortcuts hint */}
                            <span className="hidden text-[10px] text-white/50 sm:block">
                                Space·M·T·F
                            </span>

                            {/* Theater mode */}
                            <button
                                onClick={onTheaterToggle || toggleTheater}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
                                title="Theater mode (T)"
                            >
                                <Maximize2 className="h-4 w-4" />
                            </button>

                            {/* Mini player */}
                            <button
                                onClick={toggleMiniPlayer}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
                                title="Mini player"
                            >
                                <PictureInPicture2 className="h-4 w-4" />
                            </button>

                            {/* Fullscreen */}
                            <button
                                onClick={toggleFullscreen}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
                                title="Fullscreen (F)"
                            >
                                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mini player */}
            {isMiniPlayer && (
                <div className="mini-player">
                    <video
                        ref={videoRef}
                        src={video.videoUrl}
                        className="aspect-video w-full cursor-pointer"
                        onClick={togglePlay}
                        playsInline
                    />
                    <div className="absolute inset-0 flex items-end justify-between p-2">
                        <div className="flex gap-1">
                            <button
                                onClick={togglePlay}
                                className="rounded bg-black/60 p-1 text-white hover:bg-black/80"
                            >
                                {isPlaying ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white" />}
                            </button>
                        </div>
                        <button
                            onClick={toggleMiniPlayer}
                            className="rounded bg-black/60 p-1 text-white hover:bg-black/80"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
