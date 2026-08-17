# Landing Page Scroll-Draw Line Design Spec

**Date:** 2026-08-17  
**Status:** Approved  
**Route:** `/` (`src/app/page.tsx`)

## Summary

Add a thick organic SVG stroke in the landing **hero** that **draws itself as the user scrolls**. The path is a background decoration (loop, self-cross, then a horizontal wave), yellow at the start and blue at the end **along the stroke**. Placeholder sections below the existing hero/marquee exist only to create scroll distance so the draw can finish.

## Requirements

| Requirement | Detail |
|---|---|
| Effect | Draw-on-scroll: empty at top, full stroke at bottom; rewinds on scroll up |
| Placement | Hero-only composition; line does not continue through lower sections |
| Style | Thick (~24px) round-cap stroke; organic Bézier (enter from top, left loop that can cross itself, wave to the right, curve down) inspired by the Lusion-style reference — not a pixel-traced copy |
| Color | Along-path gradient: `#F5C518` (yellow) at path start → `#2563EB` (blue) at path end |
| Layering | Behind logo/title (`z-10`), above dotted glow; `pointer-events-none` |
| Scroll source | App `<main>` scroller (`overflow-y-auto`), **not** `window` |
| Placeholders | 3 full-viewport dummy sections under the marquee so `/` can scroll |
| Reduced motion | `prefers-reduced-motion: reduce` → show the path fully drawn (no scroll coupling) |
| Existing hero | Keep welcome pill, logo, faculty title, dotted glow, and profile marquee |

## Non-Goals (v1)

- Marker / pill traveling along the path
- Path continuing through the placeholder sections
- GSAP / new animation libraries
- Replacing or rewriting landing copy, marquee, or sidebar/topbar
- Dark-mode-specific stroke colors (same yellow→blue on current white page)

## Architecture

`page.tsx` stays a server component (profile fetch + marquee unchanged). A client component `HeroScrollLine` renders the SVG overlay. Scroll progress is read from `<main data-app-scroll>`. Pure math (progress clamp, hex lerp, segment reveal) lives in `src/lib/scrollPath.ts` so it can be unit-tested without the DOM.

A normal SVG `linearGradient` paints in **bounding-box space**, which looks wrong on a self-crossing loop. v1 approximates an along-path gradient by sampling the path into short segments and coloring each segment by arc-length `t`.

## Components

| Unit | Responsibility | Depends on |
|---|---|---|
| `src/lib/scrollPath.ts` | Path `d`, colors, `scrollProgress`, `lerpHex`, `segmentsForProgress` | None |
| `HeroScrollLine` | Sample path in the browser, listen to `[data-app-scroll]`, render `<line>` segments | `scrollPath.ts` |
| `AppLayoutWrapper` | Expose the existing main scroller as `[data-app-scroll]` | Unchanged layout behavior |
| `page.tsx` | Relative hero wrapper + overlay + 3 placeholder sections | `HeroScrollLine` |

## Data flow

1. User scrolls `<main data-app-scroll>`.
2. `progress = clamp(scrollTop / (scrollHeight - clientHeight), 0, 1)`. If there is no overflow, progress is `1`.
3. Hidden SVG `<path>` is sampled once via `getTotalLength` / `getPointAtLength` (viewBox space; independent of layout size).
4. `segmentsForProgress(points, progress, yellow, blue)` returns the visible short segments.
5. React re-renders those `<line>` elements.

## Visual / layout

- Hero gains an outer `relative min-h-[min(70vh,36rem)]` wrapper spanning the landing `max-w-10xl` column so the stroke can be wide, not trapped in `max-w-2xl`.
- SVG: `viewBox="0 0 1200 640"`, `preserveAspectRatio="xMidYMid meet"`, `className="h-full w-full"`.
- Stroke width: `24` (viewBox units).
- Placeholders: three `<section className="flex min-h-screen items-center justify-center">` with labels `Placeholder 1` … `Placeholder 3`.

## Error handling

- If `[data-app-scroll]` is missing, progress stays `0` (no stroke). No throw.
- If path length is `0` or fewer than 2 sample points, render no segments.
- Scroll and resize listeners are removed on unmount.

## Testing

- Vitest (existing `src/**/*.test.ts`, node env) for `scrollProgress`, `lerpHex`, and `segmentsForProgress`.
- No DOM/SVG tests (node env cannot sample `SVGPathElement`).
- Manual check: `/` scrolls inside the app shell; line draws yellow→blue; reverse scroll erases; reduced-motion shows the full stroke.

## Success criteria

- At the top of `/`, little or no stroke is visible.
- Scrolling through the placeholders draws the hero path to completion with yellow at the start and blue at the end of the stroke.
- Logo, title, and marquee remain usable (line does not capture pointer events).
- No new npm dependencies.
