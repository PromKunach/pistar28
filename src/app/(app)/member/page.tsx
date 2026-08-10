"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { profile } from "console";
import { div } from "motion/react-client";
import { Highlighter } from "@/components/ui/highlighter"

type Profile = {
  id: string;
  complete_name_th: string;
  pbri_id: string;
  nickname_th:string;
};

export default function ProfileList() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfiles() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, complete_name_th, pbri_id, nickname_th");

      if (error) {
        console.error(error);
      } else {
        setProfiles(data ?? []);
        console.log(profiles.map((profile) => (
          profile.complete_name_th
          
        ) ) )
      }
      setLoading(false);
    }
    fetchProfiles();
  }, []);
const boxes = Array.from({ length: 32 }, (_, i) => i);
  if (loading) return <div>
 <p className="ml-8 mt-8 relative text-[1.3rem] xl:text-[1.8rem] ">หน้านี้<Highlighter action="box" animationDuration={500} iterations={3} color="#ff1313">
    อยู่ระหว่างการพัฒนา
  </Highlighter></p>
  <div className="p-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {boxes.map((i) => (
        <div
          key={i}
          className="rounded-lg border  border-slate-200 p-4"
        >loading...
          
        </div>
      ))}
    </div> </div>;

  return (
    <div>
      
      <p className="ml-8 mt-8 relative text-[1.3rem] xl:text-[1.8rem] ">หน้านี้<Highlighter action="box" animationDuration={500} iterations={3} color="#ff1313">
    อยู่ระหว่างการพัฒนา
  </Highlighter></p>
    <div className="p-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {profiles.map((profile) => (

        <div key={profile.id} className="rounded-lg border border-slate-200 p-4">
         <p className="font-medium"> <span>  {profile.id}. </span>  {profile.complete_name_th} ({profile.nickname_th}) </p>
          <p className="text-sm text-slate-500">{profile.pbri_id}</p>
        </div>
      ))}
    </div>
</div>
  );
}
