import { cn } from '@/utils'

function Skeleton({ className, ...props }) {
    return (
        <div
            className={cn(
                'animate-pulse rounded-md bg-muted/60',
                className
            )}
            {...props}
        />
    )
}

export function VideoCardSkeleton({ className }) {
    return (
        <div className={cn('flex flex-col gap-3', className)}>
            <Skeleton className="aspect-video w-full rounded-xl" />
            <div className="flex gap-3">
                <Skeleton className="mt-0.5 h-9 w-9 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2 pt-1">
                    <Skeleton className="h-3.5 w-full rounded" />
                    <Skeleton className="h-3 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                </div>
            </div>
        </div>
    )
}

export { Skeleton }
