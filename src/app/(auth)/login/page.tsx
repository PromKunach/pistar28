"use client";
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { ThreeDMarquee } from "@/components/ui/3d-marquee";
 import { Button } from "@/components/ui/stateful-button";
import { supabase } from "@/lib/supabaseClient";
import {
  IconBrandGithub,
  IconBrandGoogle,
  IconBrandOnlyfans,
} from "@tabler/icons-react";




export default function SignupFormDemo() {
  // pfp_1.JPG ... pfp_32.JPG from the "images" bucket, "images/pfp/" folder
  const PFP_COUNT = 32;
  const images = Array.from({ length: PFP_COUNT }, (_, i) => {
    const filename = `pfp_${i + 1}.JPG`;
    const { data } = supabase.storage.from("images").getPublicUrl(`images/pfp/${filename}`);
    return data.publicUrl;
  });
  const handleClick = () => {
    return new Promise((resolve) => {
      setTimeout(resolve, 4000);
    });
  };
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form submitted");
  };
  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <div className="shadow-input flex w-full flex-1 items-center justify-center rounded-none bg-white p-4 md:p-8 dark:bg-black">
        <div className="w-full max-w-md">
          <div className="flex">
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
              <Image className="mb-5" src="/logo_img.png" alt="logo" width={80} height={80} />
              เข้าสู่ระบบ
            </h2>
          </div>

          <p className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-300 ">
            สำหรับนักศึกษาในศูนย์ ใช้อีเมล @pi.ac.th เพื่อมีส่วนร่วมในระบบ
          </p>

          <form className="my-8" onSubmit={handleSubmit}>
            <div className="mb-4 flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2"></div>
            <LabelInputContainer className="mb-4">
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder="12345678910@pi.ac.th" type="email" />
            </LabelInputContainer>
            <LabelInputContainer className="mb-4">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input id="password" placeholder="••••••••" type="password" />
            </LabelInputContainer>

<div className="flex h-40 w-full items-center justify-center">
      <Button
onClick={handleClick} 
>  Log in
      </Button>
    </div>
            <div className="my-8 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent dark:via-neutral-700" />
          </form>
        </div>
      </div>

      {/* Marquee panel — hidden on mobile, side panel from md upward */}
      <div className="hidden md:block md:w-1/2 lg:w-[45%]">
        <ThreeDMarquee images={images} />
      </div>
    </div>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex w-full flex-col space-y-2", className)}>
      {children}
    </div>
  );
};
