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
