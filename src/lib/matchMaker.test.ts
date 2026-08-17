import { describe, expect, it } from "vitest";

import {
  makePairKey,
  runPairFrequencyExperiment,
  splitByGroupCount,
  splitByMembersPerGroup,
  splitIntoPairs,
} from "./matchMaker";

describe("splitIntoPairs", () => {
  it("pairs even count", () => {
    expect(splitIntoPairs(["a", "b", "c", "d"])).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("leaves odd member solo", () => {
    expect(splitIntoPairs(["a", "b", "c"])).toEqual([["a", "b"], ["c"]]);
  });
});

describe("splitByMembersPerGroup", () => {
  it("chunks by size", () => {
    expect(splitByMembersPerGroup(["a", "b", "c", "d", "e"], 2)).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e"],
    ]);
  });
});

describe("splitByGroupCount", () => {
  it("distributes evenly", () => {
    const groups = splitByGroupCount(["a", "b", "c", "d", "e"], 2);
    expect(groups).toHaveLength(2);
    expect(groups.flat()).toHaveLength(5);
  });
});

describe("makePairKey", () => {
  it("orders ids consistently", () => {
    expect(makePairKey("b", "a")).toBe("a|b");
    expect(makePairKey("a", "b")).toBe("a|b");
  });
});

describe("runPairFrequencyExperiment", () => {
  it("counts pair appearances across rounds", () => {
    const entries = runPairFrequencyExperiment(["a", "b", "c", "d"], 100);
    const total = entries.reduce((sum, entry) => sum + entry.count, 0);
    expect(total).toBe(200);
    expect(entries.every((entry) => entry.count > 0)).toBe(true);
  });

  it("skips solo leftovers in odd pools", () => {
    const entries = runPairFrequencyExperiment(["a", "b", "c"], 50);
    const total = entries.reduce((sum, entry) => sum + entry.count, 0);
    expect(total).toBe(50);
  });
});
