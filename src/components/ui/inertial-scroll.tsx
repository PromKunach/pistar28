"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type InertialScrollAreaProps = {
  children: ReactNode;
  className?: string;
};

export function InertialScrollArea({ children, className }: InertialScrollAreaProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let velocity = 0;
    let rafId = 0;

    const friction = 0.2;
    const sensitivity = 0.2;

    const step = () => {
      if (Math.abs(velocity) < 0.2) {
        velocity = 0;
        return;
      }

      const maxScroll = el.scrollHeight - el.clientHeight;
      const next = el.scrollTop + velocity;

      if (next < 0 || next > maxScroll) {
        el.scrollTop = Math.max(0, Math.min(maxScroll, next));
        velocity *= 0.9;
      } else {
        el.scrollTop = next;
        velocity *= friction;
      }

      rafId = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;

      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop >= maxScroll - 1;
      if ((e.deltaY > 0 && atBottom) || (e.deltaY < 0 && atTop)) return;

      e.preventDefault();
      velocity += e.deltaY * sensitivity;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(step);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={ref} className={cn("overflow-y-auto", className)}>
      {children}
    </div>
  );
}
