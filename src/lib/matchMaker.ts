export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function splitIntoPairs<T>(items: readonly T[]): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    groups.push(items.slice(i, i + 2));
  }
  return groups;
}

export function splitByMembersPerGroup<T>(
  items: readonly T[],
  membersPerGroup: number
): T[][] {
  const size = Math.max(2, Math.min(16, Math.floor(membersPerGroup)));
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

export function splitByGroupCount<T>(items: readonly T[], groupCount: number): T[][] {
  const count = Math.max(2, Math.min(16, Math.floor(groupCount)));
  const shuffled = shuffle(items);
  const groups: T[][] = Array.from({ length: count }, () => []);
  shuffled.forEach((item, index) => {
    groups[index % count].push(item);
  });
  return groups.filter((group) => group.length > 0);
}

export function runMatch<T>(options: {
  items: readonly T[];
  mode: "pair" | "group";
  groupStrategy?: "per_group" | "group_count";
  membersPerGroup?: number;
  groupCount?: number;
}): T[][] {
  const pool = shuffle(options.items);
  if (options.mode === "pair") return splitIntoPairs(pool);
  if (options.groupStrategy === "group_count") {
    return splitByGroupCount(pool, options.groupCount ?? 2);
  }
  return splitByMembersPerGroup(pool, options.membersPerGroup ?? 4);
}

export function makePairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

export type PairFrequencyEntry = {
  memberA: string;
  memberB: string;
  count: number;
};

export function runPairFrequencyExperiment(
  items: readonly string[],
  rounds = 100
): PairFrequencyEntry[] {
  const counts = new Map<string, number>();

  for (let round = 0; round < rounds; round += 1) {
    const groups = runMatch({ items, mode: "pair" });
    for (const group of groups) {
      if (group.length < 2) continue;
      const key = makePairKey(group[0], group[1]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([key, count]) => {
      const [memberA, memberB] = key.split("|");
      return { memberA, memberB, count };
    })
    .sort((left, right) => right.count - left.count);
}
