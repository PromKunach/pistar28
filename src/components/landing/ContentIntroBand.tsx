"use client";

import { BlurFade } from "@/components/ui/blur-fade";

export type ContentIntroBandProps = {
  headline: string;
  subline: string;
};

export function ContentIntroBand({ headline, subline }: ContentIntroBandProps) {
  return (
    <section className="mx-auto max-w-5xl px-6 pt-4 sm:pt-6">
      <BlurFade inView>
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <h2 className="text-xl font-medium tracking-tight text-neutral-900 sm:text-xl lg:text-[2rem] dark:text-neutral-100">
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
