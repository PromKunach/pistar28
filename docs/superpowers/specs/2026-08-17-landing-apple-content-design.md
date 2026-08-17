# Landing Apple-Style Content Sections Design Spec

**Date:** 2026-08-17  
**Status:** Approved  
**Route:** `/` (`src/app/page.tsx`)

## Summary

Below the existing hero and `ProfileSearchMarquee`, replace the inline two-column block with three Apple-inspired content sections: a typography-only intro band, then two alternating image+text feature sections. Each section reveals with a subtle blur/fade on scroll. Hero and marquee stay unchanged.

## Requirements

| Requirement | Detail |
|---|---|
| Scope | Below hero on `/` only — welcome pill, logo hero, and marquee unchanged |
| Sections | 3 total: (1) intro band, (2) feature image-left, (3) feature image-right |
| Intro band | Large centered headline + one supporting line, no image |
| Feature sections | Headline + body + rounded image; alternating layout on desktop |
| Section 2 layout | Image left, text right |
| Section 3 layout | Text left (with `md:mt-16` offset), image right |
| Images | `rounded-2xl`, `h-52 w-72 sm:h-56 sm:w-80`, `object-cover`; reuse `profiles[0]` and `profiles[1]` URLs |
| Motion | Subtle scroll reveal via `BlurFade` with `inView={true}`, `once: true` |
| Stagger | Feature sections: image `delay={0}`, text `delay={0.08}` |
| Scroll root | `BlurFade` must observe the app `<main class="overflow-y-auto">` scroller, not `window` |
| Reduced motion | `prefers-reduced-motion: reduce` → no blur filter; show content immediately (opacity-only or skip animation) |
| Typography | Intro: `text-4xl sm:text-5xl lg:text-6xl` headline; features: `text-2xl sm:text-3xl` headline, `max-w-xs sm:max-w-sm` body |
| Spacing | Intro `py-20 sm:py-28`; sections `mt-24`; columns `md:gap-24`; container `max-w-5xl px-6` |
| Text alignment | Left-aligned in feature sections; centered in intro |
| Copy | Thai placeholder in `page.tsx` (no CMS) |
| Components | Reusable `ContentIntroBand` + `ContentFeatureSection` client components |

## Non-Goals (v1)

- Hero redesign
- Moving or removing `ProfileSearchMarquee`
- Parallax, sticky scroll, or scroll-linked SVG
- New animation libraries (GSAP, etc.)
- New routes or CMS
- Fourth+ content sections

## Architecture

`page.tsx` remains a server component (profile fetch unchanged). Two new client components in `src/components/landing/` wrap `BlurFade` and layout. `BlurFade` gains scroll-root detection for the app shell.

## Components

| Unit | Responsibility |
|---|---|
| `ContentIntroBand` | Centered headline + subline in `BlurFade` |
| `ContentFeatureSection` | Alternating image/text row with staggered `BlurFade` children |
| `BlurFade` (modify) | Optional scroll root on `<main.overflow-y-auto>`; reduced-motion handling |
| `page.tsx` | Hero + marquee + intro + 2 features; remove inline `<section>` |

## `ContentFeatureSection` interface

```ts
export type ContentFeatureSectionProps = {
  title: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition: "left" | "right";
  textOffset?: boolean;
};
```

## Page copy (v1 placeholders)

| Section | Headline | Body |
|---|---|---|
| Intro | เรียนรู้ เติบโต ร่วมกัน | ชุมชนนักศึกษาแพทย์ PI*28 ที่ศูนย์โรงพยาบาลราชบุรี |
| Feature 1 | ศูนย์โรงพยาบาลราชบุรี | ศูนย์การเรียนรู้และฝึกปฏิบัติของนักศึกษาแพทย์ ที่มุ่งเน้นการดูแลผู้ป่วยอย่างใกล้ชิดและสร้างสรรค์ประสบการณ์การเรียนรู้ที่มีคุณภาพ |
| Feature 2 | คณะแพทยศาสตร์ สถาบันพระบรมราชชนก | มุ่งพัฒนาบุคลากรทางการแพทย์ที่มีความรู้ ทักษะ และจิตวิญญาณในการรักษาพยาบาลผู้ป่วยอย่างมืออาชีพ |

## Error handling

- Missing `imageSrc`: render gray `rounded-2xl` placeholder with "รูปภาพ" label (same as current page)
- Missing scroll root: `BlurFade` falls back to viewport intersection (current behavior)

## Testing

- No new Vitest files (client-only UI; node env cannot test `useInView`)
- Manual: scroll `/` inside app shell; intro and features reveal once; reduced-motion shows content without blur

## Success criteria

- Hero and marquee unchanged
- Three new sections below marquee with Apple-like spacing and typography
- Alternating feature layout matches spec; section 3 has text offset
- Scroll reveals fire when sections enter the main pane viewport
- No new dependencies
