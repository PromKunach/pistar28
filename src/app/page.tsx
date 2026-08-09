import { Search, Sparkle } from "lucide-react";
import ActionCard from "@/components/ActionCard";
import Image from "next/image";
import React from "react";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";
import { DiaTextReveal } from "@/components/ui/dia-text-reveal"
import { BlurFade } from "@/components/ui/blur-fade"
import { Marquee } from "@/components/ui/marquee"
import { Separator } from "@/components/ui/separator"
export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-10xl px-4 py-10 sm:px-6 sm:py-16">
      
      {/* Onboarding pill */}
      <div className="flex justify-center">
        <button className="flex items-center gap-2 rounded-full border  bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm ">
          <Sparkle className="h-3.5 w-3.5 text-black-500" />
         Welcome to
        </button>
      </div>

      {/* Hero */}
      <div className="flex items-center justify-center mx-auto max-w-2xl h-auto w-100% ">
       
     
     <div className="relative mx-auto flex w-full h-500px max-w-10xl items-center justify-center ">
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
 
      <div className="relative z-10 flex w-100%  flex-col items-center justify-between space-y-6 min-w-full  text-center md:flex-row margin-block-end-0 ">
        
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
             <DiaTextReveal className="font-medium dark:text-white"
    repeat
    repeatDelay={2}
    text={[ "สถาบันพระบรมราชชนก","PBRI", "PIMD30","PI*28"]}
  />
           
          </h2>
          <p className="mt-4 max-w-lg text-center text-xl text-black-600 md:text-left dark:text-neutral-300 mx-3">
            ศูนย์โรงพยาบาลราชบุรี
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
        
        </div>
      </div>
    </div>
      </div>
      
      
      
      <div className="mb-18 mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          placeholder="Search"
          className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
        />
        <kbd className="hidden shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:block">
          Ctrl
        </kbd>
        <kbd className="hidden shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:block">
          K
        </kbd>
      </div>
     
<Marquee className="[--duration:5s]">
  <div className=" bg-red-200 rounded-[48px] w-24 h-24">

  </div>
  <div className="w-24 h-24 bg-neutral-200 rounded-[48px]">

  </div>
  <div className="w-24 h-24 bg-blue-200 rounded-[48px]">

  </div>
  <div className="w-24 h-24 bg-green-200 rounded-[48px]">

  </div>
  
</Marquee>
      {/* Card grid */}
      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
        <ActionCard
          title="Ship something new"
          description="Deploy simple sites or full-stack apps with integrated compute, storage, and more."
          cta="Create app"
          variant="dropzone"
        />
        <ActionCard
          title="Add a domain"
          description="Register a new domain or bring your own. Free DNS and automatic HTTPS included."
          cta="Type in your domain..."
          ctaAsInput
          variant="rows"
        />
        <ActionCard
          title="Protect apps and users"
          description="Modern access control, private networking, and security for your users and devices."
          cta="Protect your app"
          variant="lock"
        />
      </div>
    </div>
  );
}
