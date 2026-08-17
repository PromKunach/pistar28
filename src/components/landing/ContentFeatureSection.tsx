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
