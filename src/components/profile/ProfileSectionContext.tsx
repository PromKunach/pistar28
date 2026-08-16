"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type ProfileSection = "customize" | "privacy" | "account";

type ProfileSectionContextValue = {
  section: ProfileSection;
  setSection: (section: ProfileSection) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

const ProfileSectionContext = createContext<ProfileSectionContextValue | null>(null);

export function ProfileSectionProvider({ children }: { children: ReactNode }) {
  const [section, setSection] = useState<ProfileSection>("customize");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ProfileSectionContext.Provider
      value={{ section, setSection, mobileOpen, setMobileOpen }}
    >
      {children}
    </ProfileSectionContext.Provider>
  );
}

export function useProfileSection() {
  const ctx = useContext(ProfileSectionContext);
  if (!ctx) {
    throw new Error("useProfileSection must be used within ProfileSectionProvider");
  }
  return ctx;
}
