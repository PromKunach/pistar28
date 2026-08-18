import Image from "next/image"

import { cn } from "@/lib/utils"

const LOGO_SOURCES = {
  text: {
    light: "/text_logo.png",
    dark: "/logo_text_dark.png",
  },
  icon: {
    light: "/logo_img_white.png",
    dark: "/logo_img_dark.png",
  },
} as const

type ThemeLogoProps = {
  variant: keyof typeof LOGO_SOURCES
  alt?: string
  width: number
  height: number
  className?: string
  priority?: boolean
}

export function ThemeLogo({
  variant,
  alt = "Pistar28",
  width,
  height,
  className,
  priority,
}: ThemeLogoProps) {
  const sources = LOGO_SOURCES[variant]

  return (
    <>
      <Image
        src={sources.light}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn(className, "dark:hidden")}
      />
      <Image
        src={sources.dark}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn(className, "hidden dark:block")}
      />
    </>
  )
}
