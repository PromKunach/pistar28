"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { MemberBlacklistPicker } from "@/components/tools/MemberBlacklistPicker";
import { MatchResults } from "@/components/tools/MatchResults";
import { PairExperimentResults } from "@/components/tools/PairExperimentResults";
import { RequireAuth } from "@/components/tools/RequireAuth";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { fetchMemberRoster, type MemberRosterEntry } from "@/lib/memberRoster";
import {
  runMatch,
  runPairFrequencyExperiment,
  type PairFrequencyEntry,
} from "@/lib/matchMaker";
import { cn } from "@/lib/utils";

type MatchMode = "pair" | "group";
type GroupStrategy = "per_group" | "group_count";

const EXPERIMENT_ROUNDS = 1000;

export default function MatchMakerPage() {
  const [members, setMembers] = useState<MemberRosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<MatchMode>("pair");
  const [groupStrategy, setGroupStrategy] = useState<GroupStrategy>("per_group");
  const [membersPerGroup, setMembersPerGroup] = useState("4");
  const [groupCount, setGroupCount] = useState("4");
  const [results, setResults] = useState<string[][] | null>(null);
  const [experimentResults, setExperimentResults] = useState<
    PairFrequencyEntry[] | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const roster = await fetchMemberRoster();
        if (!cancelled) setMembers(roster);
      } catch {
        if (!cancelled) setLoadError("โหลดรายชื่อสมาชิกไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const membersById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members]
  );

  const eligibleCount = members.length - excludedIds.size;

  const toggleExcluded = useCallback((id: string) => {
    setExcludedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResults(null);
    setExperimentResults(null);
  }, []);

  const runShuffle = useCallback(() => {
    const eligible = members
      .filter((member) => !excludedIds.has(member.id))
      .map((member) => member.id);
    if (eligible.length < 2) return;

    const groups = runMatch({
      items: eligible,
      mode,
      groupStrategy,
      membersPerGroup: Number(membersPerGroup) || 4,
      groupCount: Number(groupCount) || 4,
    });
    setResults(groups);
    setExperimentResults(null);
  }, [members, excludedIds, mode, groupStrategy, membersPerGroup, groupCount]);

  const runExperiment = useCallback(() => {
    const eligible = members
      .filter((member) => !excludedIds.has(member.id))
      .map((member) => member.id);
    if (eligible.length < 2) return;

    const frequencies = runPairFrequencyExperiment(eligible, EXPERIMENT_ROUNDS);
    setExperimentResults(frequencies);
    setResults(null);
  }, [members, excludedIds]);

  return (
    <RequireAuth>
      <div className="mx-auto max-w-[800px] px-4 py-6">
        <ToolPageHeader
          title="จับคู่ / แบ่งกลุ่ม"
          description="สุ่มจากสมาชิก 32 คน"
        />

        <div className="mb-6 flex gap-2">
          {(
            [
              { value: "pair", label: "จับคู่" },
              { value: "group", label: "แบ่งกลุ่ม" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setMode(option.value);
                setResults(null);
                setExperimentResults(null);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                mode === option.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {mode === "group" ? (
          <div className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex gap-2">
              {(
                [
                  { value: "per_group", label: "คนต่อกลุ่ม" },
                  { value: "group_count", label: "จำนวนกลุ่ม" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setGroupStrategy(option.value);
                    setResults(null);
                  }}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    groupStrategy === option.value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {groupStrategy === "per_group" ? (
              <div className="space-y-2">
                <Label htmlFor="members-per-group">จำนวนคนต่อกลุ่ม</Label>
                <Input
                  id="members-per-group"
                  type="number"
                  min={2}
                  max={16}
                  value={membersPerGroup}
                  onChange={(e) => {
                    setMembersPerGroup(e.target.value);
                    setResults(null);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="group-count">จำนวนกลุ่ม</Label>
                <Input
                  id="group-count"
                  type="number"
                  min={2}
                  max={16}
                  value={groupCount}
                  onChange={(e) => {
                    setGroupCount(e.target.value);
                    setResults(null);
                  }}
                />
              </div>
            )}
          </div>
        ) : null}

        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
        ) : loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {loadError}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              ลองใหม่
            </Button>
          </div>
        ) : (
          <MemberBlacklistPicker
            members={members}
            excludedIds={excludedIds}
            onToggle={toggleExcluded}
          />
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" onClick={runShuffle} disabled={eligibleCount < 2 || loading}>
            สุ่ม
          </Button>
          {results ? (
            <Button type="button" variant="secondary" onClick={runShuffle}>
              สุ่มใหม่
            </Button>
          ) : null}
          {mode === "pair" ? (
            <Button
              type="button"
              variant="outline"
              onClick={runExperiment}
              disabled={eligibleCount < 2 || loading}
            >
              ทดลอง ({EXPERIMENT_ROUNDS} รอบ)
            </Button>
          ) : null}
        </div>

        {eligibleCount < 2 && !loading ? (
          <p className="mt-2 text-sm text-amber-700">ต้องมีสมาชิกอย่างน้อย 2 คน</p>
        ) : null}

        {results ? (
          <div className="mt-6">
            <MatchResults groups={results} membersById={membersById} mode={mode} />
          </div>
        ) : null}

        {experimentResults ? (
          <div className="mt-6 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              ผลการทดลอง ({EXPERIMENT_ROUNDS} รอบ)
            </h2>
            <p className="text-sm text-slate-500">
              แสดงจำนวนครั้งที่แต่ละคู่ถูกจับด้วยกัน
            </p>
            <PairExperimentResults
              entries={experimentResults}
              membersById={membersById}
              rounds={EXPERIMENT_ROUNDS}
            />
          </div>
        ) : null}
      </div>
    </RequireAuth>
  );
}
