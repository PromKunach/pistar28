import { Sparkle } from "lucide-react";
import ActionCard from "@/components/ActionCard";
import Image from "next/image";
import React from "react";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";
import { DiaTextReveal } from "@/components/ui/dia-text-reveal"
import { BlurFade } from "@/components/ui/blur-fade"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabaseClient";
import ProfileSearchMarquee from "@/components/ProfileSearchMarquee";

// Generates pfp_1.JPG ... pfp_32.JPG public URLs from the "images" bucket, "pfp/" folder
const PFP_COUNT = 32;
const pfpImages = Array.from({ length: PFP_COUNT }, (_, i) => {
  const filename = `pfp_${i + 1}.JPG`;
  const { data } = supabase.storage.from("images").getPublicUrl(`images/pfp/${filename}`);
  return { filename, url: data.publicUrl };
});

export default async function DashboardPage() {
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, full_name_th, nickname_th")
    .order("id", { ascending: true });

  const profiles = (profileRows ?? []).map((row, i) => ({
    ...row,
    filename: pfpImages[i]?.filename ?? "",
    url: pfpImages[i]?.url ?? "",
  }));

  return (
    <div className="mx-auto max-w-10xl py-10  sm:py-16">
      
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
    text={[ "สถาบันพระบรมราชชนก", "PIMD30","PI*28"]}
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
      
      
      <ProfileSearchMarquee profiles={profiles} />


      {/* Card grid 
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
      */}
    </div>
    
  );
}
