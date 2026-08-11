"use client";
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Highlighter } from "@/components/ui/highlighter";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ThreeDMarquee } from "@/components/ui/3d-marquee";
import { Button } from "@/components/ui/stateful-button";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

function friendlyAuthError(message: string) {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials") ||
    lower.includes("wrong password") ||
    lower.includes("email not confirmed")
  ) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง";
  }
  return message;
}

export default function SignupFormDemo() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const PFP_COUNT = 32;
  const images = Array.from({ length: PFP_COUNT }, (_, i) => {
    const filename = `pfp_${i + 1}.JPG`;
    const { data } = supabase.storage.from("images").getPublicUrl(`images/pfp/${filename}`);
    return data.publicUrl;
  });

  const handleLogin = async () => {
    setError(null);

    const trimmedEmail = email.trim();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (authError) {
      setError(friendlyAuthError(authError.message));
      throw authError;
    }

    // Match email local-part (before @) to profiles.pbri_id and cache display name
    const studentId = trimmedEmail.split("@")[0]?.trim() ?? "";
    if (studentId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name_th, nickname_th, pbri_id")
        .eq("pbri_id", studentId)
        .maybeSingle();

      const displayName =
        profile?.nickname_th?.trim() ||
        profile?.full_name_th?.trim() ||
        studentId;

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "pistar_user",
          JSON.stringify({
            studentId,
            displayName,
            email: trimmedEmail,
          }),
        );
      }
    }

    router.push("/");
    router.refresh();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void handleLogin();
  };

  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <div className="shadow-input flex w-full flex-1 items-center justify-center rounded-none bg-white p-4 md:p-8 dark:bg-black">
        <div className="w-full max-w-md">
          <div className="flex">
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
              <Image className="mb-5" src="/logo_img_white.png" alt="logo" width={80} height={80} />
              เข้าสู่ระบบ
            </h2>
          </div>

          <div className="mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-300 relative">
            <Highlighter action="highlight" animationDuration={500} iterations={3} color="#fdff7d8b">
              <div className=" px-[5px]"> เฉพาะนักศึกษาในศูนย์ </div>
            </Highlighter>{" "}
            ใช้อีเมล @pi.ac.th เพื่อมีส่วนร่วมในระบบ
          </div>

          <form className="my-8" onSubmit={handleSubmit}>
            <div className="mb-4 flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2"></div>
            <LabelInputContainer className="mb-4">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="12345678910@pi.ac.th"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                required
              />
            </LabelInputContainer>
            <LabelInputContainer className="mb-4">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                required
              />
            </LabelInputContainer>

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {error}
              </div>
            )}

            <div className="flex h-40 w-full items-center pl-[8px]">
              <Link
                href="/"
                className="pt-[5px] flex h-[36px] w-[100px] rounded-[24px] outline-2 mr-[8px] px-5 outline-black hover:bg-neutral-100 cursor-pointer align-item-center text-center"
              >
                cancel
              </Link>
              <Button type="button" onClick={handleLogin}>
                Log in
              </Button>
            </div>
            <div className="my-8 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent dark:via-neutral-700" />
          </form>
        </div>
      </div>

      <div className="hidden md:block md:w-1/2 lg:w-[45%]">
        <ThreeDMarquee images={images} />
      </div>
    </div>
  );
}

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
