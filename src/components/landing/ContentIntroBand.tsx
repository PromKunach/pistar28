"use client";

import { BlurFade } from "@/components/ui/blur-fade";

export type ContentIntroBandProps = {
  headline: string;
  subline: string;
};

export function ContentIntroBand({ headline, subline }: ContentIntroBandProps) {
  return (
    <section className="mx-auto max-w-5xl px-4 pt-4 sm:px-6 sm:pt-6">
      <BlurFade inView>
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <h2 className="text-lg font-medium tracking-tight text-foreground sm:text-xl lg:text-[2rem]">
            {headline}
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:mt-6 sm:text-lg md:text-xl">
            {subline}
          </p>
        </div>
      </BlurFade>
    </section>
  );
}
