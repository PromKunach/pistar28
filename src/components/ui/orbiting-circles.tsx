import React from "react"
import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

export interface OrbitingCirclesProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  children?: React.ReactNode
  reverse?: boolean
  duration?: number
  delay?: number
  radius?: number
  path?: boolean
  iconSize?: number
  speed?: number
}

export type OrbitLayerConfig<T> = {
  radius: number
  iconSize: number
  reverse: boolean
  speed: number
  items: T[]
}

export type SplitOrbitLayersOptions = {
  baseRadius?: number
  radiusStep?: number
  baseIconSize?: number
  maxPerLayer?: number
  baseSpeed?: number
}

export function splitIntoOrbitLayers<T>(
  items: T[],
  {
    baseRadius = 100,
    radiusStep = 62,
    baseIconSize = 72,
    maxPerLayer = 5,
    baseSpeed = 1,
  }: SplitOrbitLayersOptions = {}
): OrbitLayerConfig<T>[] {
  if (items.length === 0) return []

  const layerCount = Math.max(1, Math.ceil(items.length / maxPerLayer))
  const buckets: T[][] = Array.from({ length: layerCount }, () => [])

  items.forEach((item, index) => {
    buckets[index % layerCount].push(item)
  })

  return buckets.map((layerItems, layerIndex) => ({
    radius: baseRadius + layerIndex * radiusStep,
    iconSize: Math.max(52, baseIconSize - layerIndex * 6),
    reverse: layerIndex % 2 === 1,
    speed: baseSpeed * (1 + layerIndex * 0.12),
    items: layerItems,
  }))
}

export interface LayeredOrbitingCirclesProps<T> {
  items: T[]
  renderItem: (item: T) => React.ReactNode
  getItemKey: (item: T) => React.Key
  baseRadius?: number
  radiusStep?: number
  baseIconSize?: number
  maxPerLayer?: number
  duration?: number
  baseSpeed?: number
  className?: string
  /** Shrink the rings when the outermost orbit would not fit the container. */
  fitToContainer?: boolean
}

export function LayeredOrbitingCircles<T>({
  items,
  renderItem,
  getItemKey,
  baseRadius = 100,
  radiusStep = 62,
  baseIconSize = 72,
  maxPerLayer = 5,
  duration = 20,
  baseSpeed = 1,
  className,
  fitToContainer = true,
}: LayeredOrbitingCirclesProps<T>) {
  const layers = splitIntoOrbitLayers(items, {
    baseRadius,
    radiusStep,
    baseIconSize,
    maxPerLayer,
    baseSpeed,
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const outerLayer = layers[layers.length - 1]
  const outerRadius = outerLayer?.radius ?? 0
  const outerIconSize = outerLayer?.iconSize ?? 0

  useEffect(() => {
    const el = containerRef.current
    if (!fitToContainer || !el || outerRadius === 0) {
      setScale(1)
      return
    }

    function measure() {
      if (!el) return
      const { width, height } = el.getBoundingClientRect()
      const available = Math.min(width, height) / 2 - outerIconSize / 2 - 8
      if (available <= 0) return
      setScale(Math.min(1, available / outerRadius))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [fitToContainer, outerRadius, outerIconSize])

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        className
      )}
    >
      {layers.map((layer, layerIndex) => (
        <OrbitingCircles
          key={layerIndex}
          radius={Math.round(layer.radius * scale)}
          iconSize={Math.round(layer.iconSize * Math.max(scale, 0.7))}
          reverse={layer.reverse}
          duration={duration}
          speed={layer.speed}
        >
          {layer.items.map((item) => (
            <React.Fragment key={getItemKey(item)}>{renderItem(item)}</React.Fragment>
          ))}
        </OrbitingCircles>
      ))}
    </div>
  )
}

export function OrbitingCircles({
  className,
  children,
  reverse,
  duration = 20,
  radius = 160,
  path = true,
  iconSize = 30,
  speed = 1,
  ...props
}: OrbitingCirclesProps) {
  const calculatedDuration = duration / speed
  return (
    <>
      {path && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <circle
            className="stroke-black/10 stroke-1 dark:stroke-white/10"
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
          />
        </svg>
      )}
      {React.Children.map(children, (child, index) => {
        const angle = (360 / React.Children.count(children)) * index
        return (
          <div
            style={
              {
                "--duration": calculatedDuration,
                "--radius": radius,
                "--angle": angle,
                "--icon-size": `${iconSize}px`,
              } as React.CSSProperties
            }
            className={cn(
              `animate-orbit absolute flex size-(--icon-size) transform-gpu items-center justify-center overflow-visible`,
              { "[animation-direction:reverse]": reverse },
              className
            )}
            {...props}
          >
            {child}
          </div>
        )
      })}
    </>
  )
}
