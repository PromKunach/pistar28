import { type ComponentPropsWithoutRef, type CSSProperties, type ReactNode } from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string
  className?: string
  background: ReactNode
  Icon: React.ElementType
  description: string
  href: string
  cta: string
  textColor?: string
  cardColor?: string
  author?: {
    displayName: string
    avatarUrl?: string
  }
  placement?: {
    colStart: number
    colEnd: number
    rowStart: number
    rowEnd: number
  }
  /** When false, the card is display-only (e.g. live preview). */
  clickable?: boolean
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  textColor,
  cardColor,
  author,
  placement,
  clickable = true,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    style={
      {
        ...(placement
          ? {
              ["--bento-col" as string]: `${placement.colStart} / ${placement.colEnd}`,
              ["--bento-row" as string]: `${placement.rowStart} / ${placement.rowEnd}`,
            }
          : null),
        ...(cardColor ? { backgroundColor: cardColor } : null),
        ...(cardColor ? { ["--tile-fade-to" as string]: cardColor } : null),
      } as CSSProperties
    }
    className={cn(
      "relative flex flex-col justify-between overflow-hidden rounded-xl",
      clickable && "cursor-pointer",
      placement
        ? "col-span-full lg:[grid-column:var(--bento-col)] lg:[grid-row:var(--bento-row)]"
        : "col-span-3",
      // light styles
      !cardColor &&
        "bg-background [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
      cardColor &&
        "[box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
      // dark styles
      "transform-gpu dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:[border:1px_solid_rgba(255,255,255,.1)]",
      !cardColor && "dark:bg-background",
      className
    )}
    {...props}
  >
    <div className="pointer-events-none absolute inset-0 z-0">{background}</div>
    {author && (
      <div className="pointer-events-none absolute top-3 right-3 z-20 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full bg-black/55 px-2.5 py-1.5 shadow-sm backdrop-blur-md ring-1 ring-black/20">
        <div className="min-w-0 text-right">
          <p className="text-[10px] leading-none text-neutral-400">Posted by</p>
          <p className="truncate text-xs font-medium text-neutral-100">
            {author.displayName}
          </p>
        </div>
        {author.avatarUrl ? (
          <img
            src={author.avatarUrl}
            alt=""
            className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/20"
          />
        ) : (
          <div className="h-7 w-7 shrink-0 rounded-full bg-neutral-700 ring-1 ring-white/20" />
        )}
      </div>
    )}
    <div className="relative z-10 mt-auto p-4">
      <div className="pointer-events-none z-10 flex flex-col gap-1">
        <Icon
          className="h-12 w-12"
          style={{ color: textColor ?? "var(--foreground)" }}
        />
        <h3
          className="text-xl font-semibold"
          style={{ color: textColor ?? "var(--foreground)" }}
        >
          {name}
        </h3>
        <p
          className="max-w-lg text-neutral-400"
          style={
            textColor
              ? { color: `color-mix(in oklch, ${textColor} 58%, transparent)` }
              : undefined
          }
        >
          {description}
        </p>
      </div>

      {cta && (
        <p
          className="mt-4 text-sm text-neutral-500"
          style={
            textColor
              ? { color: `color-mix(in oklch, ${textColor} 45%, transparent)` }
              : undefined
          }
        >
          {cta}
        </p>
      )}
    </div>

    {clickable && (
      <Link
        href={href}
        aria-label={name}
        className="absolute inset-0 z-30 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
      />
    )}

  </div>
)

function BentoCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative col-span-3 flex h-[22rem] flex-col overflow-hidden rounded-xl",
        "bg-background [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        "dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:[border:1px_solid_rgba(255,255,255,.1)]",
        "lg:col-span-1",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-[58%] animate-pulse bg-neutral-200/70 dark:bg-neutral-800" />
      <div className="absolute inset-x-0 top-[40%] h-[28%] bg-gradient-to-b from-transparent via-background/40 to-background" />

      <div className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-neutral-100/90 px-2.5 py-1.5 ring-1 ring-neutral-200/80 dark:bg-neutral-900/90 dark:ring-neutral-700">
        <div className="space-y-1 text-right">
          <div className="ms-auto h-2 w-10 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="ms-auto h-3 w-14 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
        <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700" />
      </div>

      <div className="relative mt-auto space-y-3 p-4">
        <div className="h-12 w-12 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-6 w-[72%] animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
        <div className="space-y-2 pt-1">
          <div className="h-3 w-full animate-pulse rounded bg-neutral-100 dark:bg-neutral-800/90" />
          <div className="h-3 w-[88%] animate-pulse rounded bg-neutral-100 dark:bg-neutral-800/90" />
        </div>
      </div>
    </div>
  )
}

function BentoGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <BentoCardSkeleton key={index} />
      ))}
    </>
  )
}

export { BentoCard, BentoCardSkeleton, BentoGrid, BentoGridSkeleton }
