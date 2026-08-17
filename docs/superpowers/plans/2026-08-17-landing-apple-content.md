# Landing Apple-Style Content Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three Apple-inspired content sections below the landing marquee (intro band + two alternating feature blocks) with subtle blur/fade scroll reveals.

**Architecture:** Keep `page.tsx` as a server component. New client components `ContentIntroBand` and `ContentFeatureSection` in `src/components/landing/` wrap existing `BlurFade`. Update `BlurFade` to use the app `<main>` scroller as the intersection root and respect reduced motion.

**Tech Stack:** Next.js App Router, React 19, Tailwind 4, `motion/react`, existing `BlurFade`, `next/image`. No new dependencies.

## Global Constraints

- Hero (welcome pill + logo + `DiaTextReveal`) and `ProfileSearchMarquee` position unchanged
- Three sections below marquee: intro (no image) + feature image-left + feature image-right
- Feature 3 text column uses `md:mt-16` offset (`textOffset={true}`)
- Images: `rounded-2xl`, `h-52 w-72 sm:h-56 sm:w-80`, `object-cover`; `profiles[0]` and `profiles[1]` URLs
- `BlurFade` scroll root: `main.overflow-y-auto` (app pane), not `window`
- `BlurFade inView` with `once: true`; feature stagger image `delay={0}`, text `delay={0.08}`
- `prefers-reduced-motion: reduce` → no blur filter on reveal
- Intro typography: `text-4xl sm:text-5xl lg:text-6xl` headline, centered
- Feature typography: `text-2xl sm:text-3xl` headline, `max-w-xs sm:max-w-sm` left-aligned body
- Container: `max-w-5xl px-6`; intro `py-20 sm:py-28`; section gaps `mt-24`, `md:gap-24`
- Thai copy per spec table in `docs/superpowers/specs/2026-08-17-landing-apple-content-design.md`
- No parallax, sticky scroll, GSAP, or new routes

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `docs/superpowers/specs/2026-08-17-landing-apple-content-design.md` | Exists | Approved design spec |
| `src/components/ui/blur-fade.tsx` | Modify | Scroll root + reduced motion |
| `src/components/landing/ContentIntroBand.tsx` | Create | Centered intro band |
| `src/components/landing/ContentFeatureSection.tsx` | Create | Alternating feature row |
| `src/app/page.tsx` | Modify | Wire sections; remove inline two-column block |

---

### Task 1: `BlurFade` scroll root + reduced motion

**Files:**
- Modify: `src/components/ui/blur-fade.tsx`

**Interfaces:**
- Produces: unchanged `BlurFade` export; when `inView={true}`, intersection uses `document.querySelector("main.overflow-y-auto")` as `root` when present; reduced motion disables blur in variants

- [ ] **Step 1: Add scroll root detection**

In `src/components/ui/blur-fade.tsx`, add imports:

```tsx
import { useEffect, useRef, useState } from "react"
```

Replace the `useInView` block with:

```tsx
  const ref = useRef(null)
  const [scrollRoot, setScrollRoot] = useState<Element | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const main = document.querySelector("main.overflow-y-auto")
    if (main) setScrollRoot(main)

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updateMotion = () => setReducedMotion(mq.matches)
    updateMotion()
    mq.addEventListener("change", updateMotion)
    return () => mq.removeEventListener("change", updateMotion)
  }, [])

  const inViewResult = useInView(ref, {
    once: true,
    margin: inViewMargin,
    ...(scrollRoot ? { root: scrollRoot } : {}),
  })
  const isInView = !inView || inViewResult
```

- [ ] **Step 2: Apply reduced-motion variants**

After `const combinedVariants = variant ?? defaultVariants`, add:

```tsx
  const motionVariants: Variants =
    reducedMotion && !variant
      ? {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        }
      : combinedVariants
```

Use `motionVariants` instead of `combinedVariants` on `motion.div` (`variants={motionVariants}`).

Update filter transition guard to use `motionVariants`:

```tsx
  const hiddenFilter = getFilter(motionVariants.hidden)
  const visibleFilter = getFilter(motionVariants.visible)
```

- [ ] **Step 3: Verify existing app still builds**

Run: `npm test -- --run`  
Expected: PASS (all existing tests; no new tests for this task)

- [ ] **Step 4: Commit**

Windows PowerShell:

```powershell
git add src/components/ui/blur-fade.tsx
git commit -m "Improve BlurFade for app scroll root and reduced motion."
```

---

### Task 2: Landing content components

**Files:**
- Create: `src/components/landing/ContentIntroBand.tsx`
- Create: `src/components/landing/ContentFeatureSection.tsx`

**Interfaces:**
- Consumes: `BlurFade` from `@/components/ui/blur-fade`, `Image` from `next/image`
- Produces:
  - `export type ContentIntroBandProps = { headline: string; subline: string }`
  - `export function ContentIntroBand(props: ContentIntroBandProps): JSX.Element`
  - `export type ContentFeatureSectionProps = { title: string; body: string; imageSrc: string; imageAlt: string; imagePosition: "left" | "right"; textOffset?: boolean }`
  - `export function ContentFeatureSection(props: ContentFeatureSectionProps): JSX.Element`

- [ ] **Step 1: Create `ContentIntroBand.tsx`**

Create `src/components/landing/ContentIntroBand.tsx`:

```tsx
"use client";

import { BlurFade } from "@/components/ui/blur-fade";

export type ContentIntroBandProps = {
  headline: string;
  subline: string;
};

export function ContentIntroBand({ headline, subline }: ContentIntroBandProps) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
      <BlurFade inView>
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <h2 className="text-4xl font-medium tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl dark:text-neutral-100">
            {headline}
          </h2>
          <p className="mt-6 text-lg text-slate-600 sm:text-xl dark:text-neutral-300">
            {subline}
          </p>
        </div>
      </BlurFade>
    </section>
  );
}
```

- [ ] **Step 2: Create `ContentFeatureSection.tsx`**

Create `src/components/landing/ContentFeatureSection.tsx`:

```tsx
"use client";

import Image from "next/image";
import { BlurFade } from "@/components/ui/blur-fade";

export type ContentFeatureSectionProps = {
  title: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition: "left" | "right";
  textOffset?: boolean;
};

function FeatureImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative h-52 w-72 shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:h-56 sm:w-80">
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="320px"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">
          รูปภาพ
        </div>
      )}
    </div>
  );
}

export function ContentFeatureSection({
  title,
  body,
  imageSrc,
  imageAlt,
  imagePosition,
  textOffset = false,
}: ContentFeatureSectionProps) {
  const imageBlock = (
    <BlurFade inView delay={0}>
      <FeatureImage src={imageSrc} alt={imageAlt} />
    </BlurFade>
  );

  const textBlock = (
    <BlurFade inView delay={0.08}>
      <div className={textOffset ? "md:mt-16" : undefined}>
        <h3 className="text-2xl font-medium tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-100">
          {title}
        </h3>
        <p className="mt-4 max-w-xs text-left text-base leading-relaxed text-slate-600 sm:max-w-sm sm:text-lg dark:text-neutral-300">
          {body}
        </p>
      </div>
    </BlurFade>
  );

  return (
    <section className="mx-auto mt-24 flex max-w-5xl flex-col gap-8 px-6 md:flex-row md:items-start md:justify-center md:gap-24">
      {imagePosition === "left" ? (
        <>
          <div className="flex flex-1 flex-col items-start">{imageBlock}</div>
          <div className="flex flex-1 flex-col items-start">{textBlock}</div>
        </>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-start">{textBlock}</div>
          <div className="flex flex-1 flex-col items-start">{imageBlock}</div>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- --run`  
Expected: PASS

- [ ] **Step 4: Commit**

```powershell
git add src/components/landing/ContentIntroBand.tsx src/components/landing/ContentFeatureSection.tsx
git commit -m "Add Apple-style landing intro and feature section components."
```

---

### Task 3: Wire landing page

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `ContentIntroBand`, `ContentFeatureSection` from `@/components/landing/*`
- Produces: `/` renders hero + marquee + 3 content sections; inline two-column `<section>` removed

- [ ] **Step 1: Add imports**

At top of `src/app/page.tsx`, add:

```tsx
import { ContentIntroBand } from "@/components/landing/ContentIntroBand";
import { ContentFeatureSection } from "@/components/landing/ContentFeatureSection";
```

Remove unused `BlurFade` import if present and unused.

- [ ] **Step 2: Replace inline section**

Remove the entire block from `<section className="mx-auto mt-28 flex max-w-5xl...">` through its closing `</section>` (lines ~102–146).

Immediately after `<ProfileSearchMarquee profiles={profiles} />`, add:

```tsx
      <ContentIntroBand
        headline="เรียนรู้ เติบโต ร่วมกัน"
        subline="ชุมชนนักศึกษาแพทย์ PI*28 ที่ศูนย์โรงพยาบาลราชบุรี"
      />

      <ContentFeatureSection
        title="ศูนย์โรงพยาบาลราชบุรี"
        body="ศูนย์การเรียนรู้และฝึกปฏิบัติของนักศึกษาแพทย์ ที่มุ่งเน้นการดูแลผู้ป่วยอย่างใกล้ชิดและสร้างสรรค์ประสบการณ์การเรียนรู้ที่มีคุณภาพ"
        imageSrc={profiles[0]?.url ?? ""}
        imageAlt={profiles[0]?.full_name_th ?? "รูปภาพ"}
        imagePosition="left"
      />

      <ContentFeatureSection
        title="คณะแพทยศาสตร์ สถาบันพระบรมราชชนก"
        body="มุ่งพัฒนาบุคลากรทางการแพทย์ที่มีความรู้ ทักษะ และจิตวิญญาณในการรักษาพยาบาลผู้ป่วยอย่างมืออาชีพ"
        imageSrc={profiles[1]?.url ?? ""}
        imageAlt={profiles[1]?.full_name_th ?? "รูปภาพ"}
        imagePosition="right"
        textOffset
      />
```

Do not change hero or marquee markup.

- [ ] **Step 3: Run tests**

Run: `npm test -- --run`  
Expected: PASS

- [ ] **Step 4: Manual verification**

With `npm run dev`, open `/` and confirm:

1. Hero and marquee unchanged
2. Intro band centered below marquee
3. Feature 1: image left, text right
4. Feature 2: text left (offset down on desktop), image right
5. Sections blur/fade in once when scrolled into view inside the main pane
6. No layout overflow or broken images

- [ ] **Step 5: Commit**

```powershell
git add src/app/page.tsx
git commit -m "Wire Apple-style content sections on the landing page."
```

---

## Self-Review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| Hero + marquee unchanged | Task 3 (explicit constraint) |
| Intro band | Task 2 `ContentIntroBand`, Task 3 |
| Two alternating features | Task 2 `ContentFeatureSection`, Task 3 |
| `textOffset` on section 3 | Task 2, Task 3 `textOffset` |
| Image sizes + rounded | Task 2 `FeatureImage` |
| BlurFade scroll root | Task 1 |
| Reduced motion | Task 1 |
| Stagger delays | Task 2 |
| Thai copy | Task 3 |
| No new deps | All tasks |

**Placeholder scan:** no TBD / vague steps.

**Type consistency:** `ContentFeatureSectionProps` matches across Task 2 and Task 3 usage.
