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

export function VideoCardSkeleton({ className, horizontal }) {
    if (horizontal) {
        return (
            <div className={cn('flex gap-4 w-full', className)}>
                <Skeleton className="aspect-video w-40 sm:w-64 lg:w-80 rounded-xl shrink-0" />
                <div className="flex flex-col gap-3 flex-1 pt-1">
                    <Skeleton className="h-4 w-3/4 rounded-lg" />
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-1/4 rounded-md" />
                        <Skeleton className="h-3 w-1/3 rounded-md" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            <Skeleton className="aspect-video w-full rounded-xl" />
            <div className="flex gap-3">
                <Skeleton className="mt-0.5 h-9 w-9 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2 pt-1">
                    <Skeleton className="h-4 w-full rounded-lg" />
                    <Skeleton className="h-3 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-1/2 rounded-md" />
                </div>
            </div>
        </div>
    )
}


export { Skeleton }
