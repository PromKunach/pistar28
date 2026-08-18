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
    <div className="relative mx-auto h-52 w-72 max-w-full shrink-0 overflow-hidden rounded-2xl bg-muted sm:h-56 sm:w-80">
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="320px"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
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
        <h3 className="text-center text-xl font-medium tracking-tight text-foreground sm:text-2xl md:text-left md:text-3xl">
          {title}
        </h3>
        <p className="mt-3 max-w-prose text-center text-base leading-relaxed text-muted-foreground sm:mt-4 sm:text-lg md:text-left">
          {body}
        </p>
      </div>
    </BlurFade>
  );

  return (
    <section className="mx-auto mt-14 flex w-full min-w-0 max-w-5xl flex-col gap-6 px-4 sm:mt-20 sm:gap-8 sm:px-6 md:mt-24 md:flex-row md:items-start md:justify-center md:gap-16 lg:gap-24">
      {imagePosition === "left" ? (
        <>
          <div className="flex w-full min-w-0 flex-1 flex-col items-center md:items-start">{imageBlock}</div>
          <div className="flex w-full min-w-0 flex-1 flex-col items-center md:items-start">{textBlock}</div>
        </>
      ) : (
        <>
          <div className="order-2 flex w-full min-w-0 flex-1 flex-col items-center md:order-1 md:items-start">{textBlock}</div>
          <div className="order-1 flex w-full min-w-0 flex-1 flex-col items-center md:order-2 md:items-start">{imageBlock}</div>
        </>
      )}
    </section>
  );
}
