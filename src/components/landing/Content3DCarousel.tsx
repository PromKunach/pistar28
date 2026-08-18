"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { BlurFade } from "@/components/ui/blur-fade";
import { cn } from "@/lib/utils";

export type CarouselSlide = {
  id: string;
  url: string;
  alt: string;
  label?: string;
};

export type Content3DCarouselProps = {
  title: string;
  subline?: string;
  slides: CarouselSlide[];
};

export function Content3DCarousel({
  title,
  subline,
  slides,
}: Content3DCarouselProps) {
  const [active, setActive] = useState(0);
  const [slideOffset, setSlideOffset] = useState(140);
  const count = slides.length;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setSlideOffset(mq.matches ? 100 : 140);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const goTo = (index: number) => {
    if (count === 0) return;
    setActive(((index % count) + count) % count);
  };

  const prev = () => goTo(active - 1);
  const next = () => goTo(active + 1);

  if (count === 0) return null;

  const activeSlide = slides[active];

  return (
    <section className="mx-auto mt-14 w-full min-w-0 max-w-6xl overflow-x-hidden px-4 sm:mt-20 sm:px-6 md:mt-24">
      <BlurFade inView>
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
          {subline ? (
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              {subline}
            </p>
          ) : null}
        </div>
      </BlurFade>

      <div className="relative">
        <button
          type="button"
          onClick={prev}
          aria-label="ก่อนหน้า"
          className="absolute top-1/2 left-1 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-muted sm:left-0 sm:h-10 sm:w-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={next}
          aria-label="ถัดไป"
          className="absolute top-1/2 right-1 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-muted sm:right-0 sm:h-10 sm:w-10"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div
          className="relative mx-auto flex h-[18rem] max-w-full items-center justify-center overflow-hidden sm:h-[22rem] md:h-[24rem]"
          style={{ perspective: "1200px" }}
        >
          <div className="relative h-full w-full" style={{ transformStyle: "preserve-3d" }}>
            {slides.map((slide, index) => {
              const offset = index - active;
              const abs = Math.abs(offset);
              const isHidden = abs > 2;

              return (
                <motion.button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(index)}
                  initial={false}
                  animate={{
                    x: offset * slideOffset,
                    rotateY: offset * -38,
                    scale: offset === 0 ? 1 : 0.82,
                    opacity: isHidden ? 0 : offset === 0 ? 1 : 0.55,
                    zIndex: 10 - abs,
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  className={cn(
                    "absolute top-1/2 left-1/2 h-56 w-44 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-muted shadow-lg ring-1 ring-border sm:h-60 sm:w-48",
                    offset === 0 ? "cursor-default" : "cursor-pointer"
                  )}
                  style={{ transformStyle: "preserve-3d" }}
                  aria-hidden={isHidden}
                  tabIndex={isHidden ? -1 : 0}
                >
                  {slide.url ? (
                    <Image
                      src={slide.url}
                      alt={slide.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 176px, 192px"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      รูปภาพ
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 min-h-[4rem] text-center">
          <motion.p
            key={`name-${activeSlide?.id}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="text-lg font-medium text-foreground sm:text-xl"
          >
            {activeSlide?.label || activeSlide?.alt || "—"}
          </motion.p>
          {activeSlide?.label && activeSlide.alt && activeSlide.label !== activeSlide.alt ? (
            <motion.p
              key={`full-${activeSlide.id}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="mt-1 text-sm text-muted-foreground sm:text-base"
            >
              {activeSlide.alt}
            </motion.p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`ไปที่ ${slide.alt}`}
              className={cn(
                "h-2 rounded-full transition-all",
                index === active ? "w-6 bg-foreground" : "w-2 bg-muted-foreground/40"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
