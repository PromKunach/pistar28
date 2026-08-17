import { Sparkle } from "lucide-react";
import ActionCard from "@/components/ActionCard";
import Image from "next/image";
import React from "react";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";
import { DiaTextReveal } from "@/components/ui/dia-text-reveal"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabaseClient";
import ProfileSearchMarquee from "@/components/ProfileSearchMarquee";
import { ContentIntroBand } from "@/components/landing/ContentIntroBand";
import { ContentFeatureSection } from "@/components/landing/ContentFeatureSection";
import { Content3DCarousel } from "@/components/landing/Content3DCarousel";
import { HeroStats } from "@/components/landing/HeroStats";
import { getDaysSinceSemesterOpen } from "@/components/landing/hero-stats-utils";
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
    <div className="mx-auto max-w-10xl overflow-x-hidden py-10 sm:py-16">
      
      {/* Onboarding pill */}
     

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="relative mx-auto flex w-full flex-col  justify-center">
        <DottedGlowBackground
        className="pointer-events-none mask-radial-to-50%  mask-radial-at-center opacity-20 dark:opacity-100"
        opacity={0.8}
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

          <div className="relative z-10 flex w-full flex-col items-center justify-center gap-4 md:flex-row md:items-center md:gap-6">
            <Image
              src="/text_logo.png"
              alt="text-logo"
              loading="eager"
              width={300}
              height={300}
              className="shrink-0"
            />

            <div className="flex w-full max-w-lg flex-col items-start gap-2 text-left md:w-auto">
              <h2 className="flex flex-col items-start gap-0.5 text-left text-4xl font-medium leading-tight tracking-tight text-neutral-900 sm:text-5xl dark:text-neutral-400">
                <span>คณะแพทยศาสตร์</span>
                <DiaTextReveal
                  className="block font-medium dark:text-white"
                  repeat
                  repeatDelay={2}
                  fixedWidth
                  text={["สถาบันพระบรมราชชนก", "PIMD30", "PI*28"]}
                />
              </h2>
              <p className="text-left text-xl text-black-600 dark:text-neutral-300">
                ศูนย์โรงพยาบาลราชบุรี
              </p>
            </div>
          </div>

          <HeroStats
            memberCount={profiles.length}
            daysSinceSemesterOpen={getDaysSinceSemesterOpen()}
          />
        </div>
      </section>
      <ContentIntroBand
        headline='"ขอให้ถือประโยชน์ส่วนตนเป็นที่สอง ประโยชน์ของเพื่อนมนุษย์เป็นกิจที่หนึ่ง ลาภ ทรัพย์  และเกียรติยศจะตกมาแก่ท่านเอง ถ้าท่านทรงธรรมะแห่งวิชาชีพไว้ให้บริสุทธิ์"'
        subline="สมเด็จพระบรมราชชนก"
      />

      <ProfileSearchMarquee profiles={profiles} visible={false} />

      <ContentFeatureSection
        title="ศูนย์โรงพยาบาลราชบุรี"
        body="ศูนย์การเรียนรู้และฝึกปฏิบัติของนักศึกษาแพทย์ ที่มุ่งเน้นการดูแลผู้ป่วยอย่างใกล้ชิดและสร้างสรรค์ประสบการณ์การเรียนรู้ที่มีคุณภาพ"
        imageSrc={profiles[0]?.url ?? ""}
        imageAlt={profiles[0]?.full_name_th ?? "รูปภาพ"}
        imagePosition="left"
      />

      <ContentFeatureSection
        title="คณะแพทยศาสตร์ สถาบันพระบรมราชชนก"
        body="มุ่งพัฒนาบุคลากรทางการแพทย์ที่มีความรู้ ทักษะ และจิตวิญญาณในการรักษาพยาบาลผู้ป่วยอย่างมืออาชีพ"
        imageSrc={profiles[1]?.url ?? ""}
        imageAlt={profiles[1]?.full_name_th ?? "รูปภาพ"}
        imagePosition="right"
        textOffset
      />

      <Content3DCarousel
        title="สมาชิก PI*28"
        subline="รวมนักเรียนจากจังหวัด ราชบุรี สุพรรณบุรี ประจวบคีรีขันธ์ กาญจนบุรี"
        slides={profiles.map((profile) => ({
          id: String(profile.id),
          url: profile.url,
          alt: profile.full_name_th ?? "สมาชิก",
          label: profile.nickname_th || profile.full_name_th,
        }))}
      />

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
