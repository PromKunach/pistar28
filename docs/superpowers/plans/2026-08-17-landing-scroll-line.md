# Landing Page Scroll-Draw Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw a thick yellow-to-blue organic SVG stroke in the landing hero as the user scrolls, using placeholder sections only as scroll distance.

**Architecture:** Keep `src/app/page.tsx` as a server component. Pure path math lives in `src/lib/scrollPath.ts`. A client `HeroScrollLine` samples the SVG path in the browser and reveals short colored segments from `[data-app-scroll]` progress (the existing `<main>` pane, not `window`).

**Tech Stack:** Next.js App Router, React 19, Tailwind 4, Vitest. No new npm dependencies.

## Global Constraints

- Draw-on-scroll only: empty at top of `/`, fully drawn at bottom; reverse scroll erases
- Hero-only path (placeholders do not get their own path)
- Along-path color: `#F5C518` → `#2563EB` (not a bounding-box `linearGradient`)
- Stroke width `24`, round caps, `pointer-events-none`
- Scroll source is `<main data-app-scroll>`, never `window`
- `prefers-reduced-motion: reduce` shows the path fully drawn
- Keep welcome pill, logo, faculty title, dotted glow, and profile marquee
- No GSAP / no new animation libraries
- Vitest files stay `src/**/*.test.ts` (node env)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `docs/superpowers/specs/2026-08-17-landing-scroll-line-design.md` | Exists | Approved design spec |
| `src/lib/scrollPath.ts` | Create | Path `d`, colors, progress + segment math |
| `src/lib/scrollPath.test.ts` | Create | Unit tests for that math |
| `src/components/HeroScrollLine.tsx` | Create | Client SVG overlay + scroll listener |
| `src/components/AppLayoutWrapper.tsx` | Modify | `data-app-scroll` on `<main>` |
| `src/app/page.tsx` | Modify | Hero overlay wrapper + 3 placeholder sections |

---

### Task 1: Path math lib

**Files:**
- Create: `src/lib/scrollPath.ts`
- Create: `src/lib/scrollPath.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `export type Point = { x: number; y: number }`
  - `export type PathSegment = { x1: number; y1: number; x2: number; y2: number; color: string }`
  - `export const HERO_SCROLL_PATH_D: string`
  - `export const HERO_SCROLL_VIEWBOX = "0 0 1200 640"`
  - `export const HERO_SCROLL_STROKE_WIDTH = 24`
  - `export const HERO_SCROLL_SAMPLE_COUNT = 96`
  - `export const HERO_SCROLL_COLOR_START = "#F5C518"`
  - `export const HERO_SCROLL_COLOR_END = "#2563EB"`
  - `export function clamp01(n: number): number`
  - `export function scrollProgress(scrollTop: number, scrollHeight: number, clientHeight: number): number`
  - `export function lerpHex(start: string, end: string, t: number): string`
  - `export function segmentsForProgress(points: readonly Point[], progress: number, startColor: string, endColor: string): PathSegment[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/scrollPath.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  clamp01,
  lerpHex,
  scrollProgress,
  segmentsForProgress,
} from "./scrollPath";

describe("clamp01", () => {
  it("clamps below 0 and above 1", () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(3)).toBe(1);
  });
});

describe("scrollProgress", () => {
  it("is 0 at the top and 1 at the bottom", () => {
    expect(scrollProgress(0, 2000, 1000)).toBe(0);
    expect(scrollProgress(1000, 2000, 1000)).toBe(1);
    expect(scrollProgress(500, 2000, 1000)).toBe(0.5);
  });

  it("returns 1 when there is no overflow", () => {
    expect(scrollProgress(0, 800, 800)).toBe(1);
  });

  it("clamps overscroll", () => {
    expect(scrollProgress(-20, 2000, 1000)).toBe(0);
    expect(scrollProgress(5000, 2000, 1000)).toBe(1);
  });
});

describe("lerpHex", () => {
  it("returns the start and end colors at 0 and 1", () => {
    expect(lerpHex("#F5C518", "#2563EB", 0)).toBe("#F5C518");
    expect(lerpHex("#F5C518", "#2563EB", 1)).toBe("#2563EB");
  });

  it("mixes channels at 0.5", () => {
    expect(lerpHex("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });
});

describe("segmentsForProgress", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 20, y: 0 },
  ];

  it("returns no segments at progress 0", () => {
    expect(segmentsForProgress(points, 0, "#000000", "#FFFFFF")).toEqual([]);
  });

  it("returns nothing with fewer than 2 points", () => {
    expect(segmentsForProgress([{ x: 0, y: 0 }], 1, "#000000", "#FFFFFF")).toEqual(
      []
    );
  });

  it("returns all segments at progress 1", () => {
    const segs = segmentsForProgress(points, 1, "#000000", "#FFFFFF");
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ x1: 0, y1: 0, x2: 10, y2: 0 });
    expect(segs[1]).toMatchObject({ x1: 10, y1: 0, x2: 20, y2: 0 });
    expect(segs[0]?.color).toBe("#000000");
    expect(segs[1]?.color).toBe("#FFFFFF");
  });

  it("returns a partial last segment", () => {
    const segs = segmentsForProgress(points, 0.25, "#000000", "#FFFFFF");
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({ x1: 0, y1: 0, x2: 5, y2: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/scrollPath.test.ts`  
Expected: FAIL — `Cannot find module './scrollPath'` (or equivalent module-not-found)

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/scrollPath.ts`:

```typescript
export type Point = { x: number; y: number };

export type PathSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
};

export const HERO_SCROLL_VIEWBOX = "0 0 1200 640";
export const HERO_SCROLL_STROKE_WIDTH = 24;
export const HERO_SCROLL_SAMPLE_COUNT = 96;
export const HERO_SCROLL_COLOR_START = "#F5C518";
export const HERO_SCROLL_COLOR_END = "#2563EB";

export const HERO_SCROLL_PATH_D =
  "M 520 -30 C 500 100 430 150 300 175 C 120 210 30 300 55 410 C 85 540 280 590 420 510 C 515 455 545 355 455 325 C 350 288 275 365 330 445 C 385 525 560 555 740 515 C 900 480 1020 495 1125 455 C 1205 425 1210 500 1165 555 C 1120 610 980 640 860 615";

export function clamp01(n: number): number {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

export function scrollProgress(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): number {
  const max = scrollHeight - clientHeight;
  if (max <= 0) return 1;
  return clamp01(scrollTop / max);
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, "0").toUpperCase();
}

export function lerpHex(start: string, end: string, t: number): string {
  const p = clamp01(t);
  const a = parseHex(start);
  const b = parseHex(end);
  return `#${toHex(Math.round(a.r + (b.r - a.r) * p))}${toHex(
    Math.round(a.g + (b.g - a.g) * p)
  )}${toHex(Math.round(a.b + (b.b - a.b) * p))}`;
}

export function segmentsForProgress(
  points: readonly Point[],
  progress: number,
  startColor: string,
  endColor: string
): PathSegment[] {
  if (points.length < 2) return [];
  const p = clamp01(progress);
  if (p === 0) return [];

  const segCount = points.length - 1;
  const drawn = p * segCount;
  const fullCount = Math.min(Math.floor(drawn), segCount);
  const frac = drawn - Math.floor(drawn);
  const segments: PathSegment[] = [];

  const colorAt = (index: number): string => {
    if (segCount <= 1) return lerpHex(startColor, endColor, p);
    return lerpHex(startColor, endColor, index / (segCount - 1));
  };

  for (let i = 0; i < fullCount; i++) {
    const from = points[i];
    const to = points[i + 1];
    if (!from || !to) continue;
    segments.push({
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      color: colorAt(i),
    });
  }

  if (frac > 0 && fullCount < segCount) {
    const from = points[fullCount];
    const to = points[fullCount + 1];
    if (from && to) {
      segments.push({
        x1: from.x,
        y1: from.y,
        x2: from.x + (to.x - from.x) * frac,
        y2: from.y + (to.y - from.y) * frac,
        color: colorAt(fullCount),
      });
    }
  }

  return segments;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/scrollPath.test.ts`  
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/scrollPath.ts src/lib/scrollPath.test.ts
git commit -m "$(cat <<'EOF'
Add scroll-path math for the landing draw-on-scroll line.

EOF
)"
```

---

### Task 2: Scroll hook + `HeroScrollLine`

**Files:**
- Modify: `src/components/AppLayoutWrapper.tsx`
- Create: `src/components/HeroScrollLine.tsx`

**Interfaces:**
- Consumes: all exports listed in Task 1 from `@/lib/scrollPath`
- Produces: `export default function HeroScrollLine(): JSX.Element`
- DOM contract: the app shell `<main>` must be `document.querySelector("[data-app-scroll]")`

- [ ] **Step 1: Mark the existing main scroller**

In `src/components/AppLayoutWrapper.tsx`, change the `<main>` opening tag to:

```tsx
        <main
          data-app-scroll
          className={cn(
            "flex-1 overflow-y-auto",
            pathname === "/appointment" && "no-scrollbar"
          )}
        >
```

Do not change overflow, flex, or children.

- [ ] **Step 2: Create `HeroScrollLine`**

Create `src/components/HeroScrollLine.tsx`:

```tsx
"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  HERO_SCROLL_COLOR_END,
  HERO_SCROLL_COLOR_START,
  HERO_SCROLL_PATH_D,
  HERO_SCROLL_SAMPLE_COUNT,
  HERO_SCROLL_STROKE_WIDTH,
  HERO_SCROLL_VIEWBOX,
  scrollProgress,
  segmentsForProgress,
  type Point,
} from "@/lib/scrollPath";

function samplePathPoints(path: SVGPathElement, count: number): Point[] {
  const len = path.getTotalLength();
  if (len === 0 || count < 2) return [];
  return Array.from({ length: count }, (_, i) => {
    const pt = path.getPointAtLength((i / (count - 1)) * len);
    return { x: pt.x, y: pt.y };
  });
}

export default function HeroScrollLine() {
  const pathRef = useRef<SVGPathElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [progress, setProgress] = useState(0);

  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    setPoints(samplePathPoints(path, HERO_SCROLL_SAMPLE_COUNT));
  }, []);

  useLayoutEffect(() => {
    const scroller = document.querySelector<HTMLElement>("[data-app-scroll]");
    if (!scroller) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const update = () => {
      if (reduced) {
        setProgress(1);
        return;
      }
      setProgress(
        scrollProgress(
          scroller.scrollTop,
          scroller.scrollHeight,
          scroller.clientHeight
        )
      );
    };

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const segments = segmentsForProgress(
    points,
    progress,
    HERO_SCROLL_COLOR_START,
    HERO_SCROLL_COLOR_END
  );

  return (
    <svg
      className="pointer-events-none h-full w-full"
      viewBox={HERO_SCROLL_VIEWBOX}
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <path ref={pathRef} d={HERO_SCROLL_PATH_D} fill="none" />
      {segments.map((seg, i) => (
        <line
          key={i}
          x1={seg.x1}
          y1={seg.y1}
          x2={seg.x2}
          y2={seg.y2}
          stroke={seg.color}
          strokeWidth={HERO_SCROLL_STROKE_WIDTH}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
```

- [ ] **Step 3: Re-run path math tests**

Run: `npm test -- --run src/lib/scrollPath.test.ts`  
Expected: PASS (component has no Vitest file; DOM sampling is checked in Task 3 manual steps)

- [ ] **Step 4: Commit**

```bash
git add src/components/AppLayoutWrapper.tsx src/components/HeroScrollLine.tsx
git commit -m "$(cat <<'EOF'
Add hero SVG line that draws from the app main scroller.

EOF
)"
```

---

### Task 3: Landing page overlay + placeholder scroll

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `import HeroScrollLine from "@/components/HeroScrollLine"`
- Produces: `/` renders the line behind the existing hero and three `min-h-screen` placeholder sections below the marquee

- [ ] **Step 1: Import the overlay**

At the top of `src/app/page.tsx`, add:

```tsx
import HeroScrollLine from "@/components/HeroScrollLine";
```

Keep the existing profile fetch and marquee logic.

- [ ] **Step 2: Wrap the hero and mount the line**

Replace the current `{/* Hero */}` block (the `max-w-2xl` wrapper through its closing `</div></div>`) with:

```tsx
      {/* Hero */}
      <div className="relative min-h-[min(70vh,36rem)]">
        <div className="absolute inset-0 z-[1]">
          <HeroScrollLine />
        </div>

        <div className="relative z-10 flex h-auto w-full items-center justify-center mx-auto max-w-2xl">
          <div className="relative mx-auto flex w-full max-w-10xl items-center justify-center">
            <DottedGlowBackground
              className="pointer-events-none mask-radial-to-70% mask-radial-at-center opacity-20 dark:opacity-100"
              opacity={1}
              gap={10}
              radius={5}
              colorLightVar="--color-black-500"
              glowColorLightVar="--color-black-600"
              colorDarkVar="--color-black-500"
              glowColorDarkVar="--color-black-800"
              backgroundOpacity={0}
              speedMin={0.3}
              speedMax={1.6}
              speedScale={1}
            />

            <div className="relative z-10 flex min-w-full w-full flex-col items-center justify-between space-y-6 text-center md:flex-row">
              <Image
                src="/text_logo.png"
                alt="text-logo"
                loading="eager"
                width={300}
                height={300}
              />

              <div>
                <h2 className="text-center text-4xl font-medium tracking-tight text-neutral-900 sm:text-5xl md:text-left dark:text-neutral-400 mx-3">
                  คณะแพทยศาสตร์{" "}
                  <DiaTextReveal
                    className="font-medium dark:text-white"
                    repeat
                    repeatDelay={2}
                    text={["สถาบันพระบรมราชชนก", "PIMD30", "PI*28"]}
                  />
                </h2>
                <p className="mt-4 max-w-lg text-center text-xl text-black-600 md:text-left dark:text-neutral-300 mx-3">
                  ศูนย์โรงพยาบาลราชบุรี
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
```

Keep the welcome pill **above** this wrapper. Keep `<ProfileSearchMarquee profiles={profiles} />` **below** it.

- [ ] **Step 3: Add placeholder scroll sections**

Immediately after `<ProfileSearchMarquee profiles={profiles} />`, add:

```tsx
      <section className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">Placeholder 1</p>
      </section>
      <section className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">Placeholder 2</p>
      </section>
      <section className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">Placeholder 3</p>
      </section>
```

Do not uncomment or delete the existing commented ActionCard grid.

- [ ] **Step 4: Re-run unit tests**

Run: `npm test -- --run src/lib/scrollPath.test.ts`  
Expected: PASS

- [ ] **Step 5: Manual verification in the browser**

With `npm run dev` already running, open `/` and confirm:

1. The inner app pane (not the window) scrolls through three placeholder sections.
2. At the top, the hero stroke is missing or only a short yellow tip.
3. Scrolling down draws the loop/wave; the stroke is yellow near the start and blue near the end.
4. Scrolling back up erases the stroke.
5. Logo and title stay clickable/selectable; the line does not block them.
6. Optional: OS reduced-motion → full stroke visible without scrolling.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx
git commit -m "$(cat <<'EOF'
Wire the scroll-draw line and placeholder sections on the landing page.

EOF
)"
```

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| Draw-on-scroll, reverse on scroll up | Task 2 listener + Task 1 `segmentsForProgress` |
| Hero-only path | Task 3 overlay confined to hero wrapper |
| Thick organic loop/wave | Task 1 `HERO_SCROLL_PATH_D` + stroke 24 |
| Along-path yellow→blue | Task 1 `lerpHex` + segmented `<line>`s |
| Behind logo, above glow, no pointer events | Task 3 z-index + Task 2 `pointer-events-none` |
| Scroll from `<main>`, not window | Task 2 `data-app-scroll` |
| 3 placeholder sections | Task 3 |
| Reduced motion → full path | Task 2 `matchMedia` |
| Keep existing hero/marquee | Task 3 |
| No new dependencies | All tasks |
| Vitest for math | Task 1 |

**Placeholder scan:** no TBD / “implement later” / “add error handling” steps.

**Type consistency:** `Point`, `PathSegment`, `scrollProgress`, `segmentsForProgress`, `HERO_SCROLL_*` names match across Task 1 tests, Task 1 impl, and Task 2 imports.
