"use client"

import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabaseClient"

export type CurrentUser = {
  studentId: string
  displayName: string
  email: string
  avatarUrl?: string
}

const PFP_COUNT = 32

export function getPfpUrl(index: number) {
  const filename = `pfp_${(index % PFP_COUNT) + 1}.JPG`
  const { data } = supabase.storage.from("images").getPublicUrl(`images/pfp/${filename}`)
  return data.publicUrl
}

export async function resolveUserProfile(email: string): Promise<CurrentUser | null> {
  const studentId = email.split("@")[0]?.trim() ?? ""
  if (!studentId) return null

  let { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name_th, nickname_th, pbri_id")
    .eq("pbri_id", studentId)
    .maybeSingle()

  if (!profile && /^\d+$/.test(studentId)) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name_th, nickname_th, pbri_id")
      .eq("pbri_id", Number(studentId))
      .maybeSingle()
    profile = data
  }

  const displayName =
    profile?.nickname_th?.trim() ||
    profile?.full_name_th?.trim() ||
    studentId

  let avatarUrl: string | undefined
  if (profile?.id != null) {
    const { data: orderedProfiles } = await supabase
      .from("profiles")
      .select("id")
      .order("id", { ascending: true })

    const index =
      orderedProfiles?.findIndex((row) => String(row.id) === String(profile!.id)) ?? -1
    avatarUrl = getPfpUrl(index >= 0 ? index : Number(profile.id) - 1)
  }

  const user: CurrentUser = { studentId, displayName, email, avatarUrl }

  if (typeof window !== "undefined") {
    localStorage.setItem("pistar_user", JSON.stringify(user))
  }

  return user
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const applyUser = async (email: string | undefined | null) => {
      if (!email) {
        if (!cancelled) {
          setUser(null)
          localStorage.removeItem("pistar_user")
        }
        return
      }

      try {
        const cached = localStorage.getItem("pistar_user")
        if (cached) {
          const parsed = JSON.parse(cached) as CurrentUser
          if (parsed.email === email && parsed.displayName && !cancelled) {
            setUser(parsed)
          }
        }
      } catch {
        /* ignore bad cache */
      }

      const profile = await resolveUserProfile(email)
      if (!cancelled) setUser(profile)
    }

    const init = async () => {
      const { data } = await supabase.auth.getSession()
      await applyUser(data.session?.user?.email)
      if (!cancelled) setReady(true)
    }

    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user?.email)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return { user, ready }
}
