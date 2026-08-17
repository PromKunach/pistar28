import { describe, expect, it } from "vitest"

import { formatFeedPostTime, isFeedPostEmpty } from "./feedPostFormat"

describe("isFeedPostEmpty", () => {
  it("true when no text and no images", () => {
    expect(isFeedPostEmpty("  ", 0)).toBe(true)
  })

  it("false when text present", () => {
    expect(isFeedPostEmpty("hello", 0)).toBe(false)
  })

  it("false when images present", () => {
    expect(isFeedPostEmpty("", 1)).toBe(false)
  })
})

describe("formatFeedPostTime", () => {
  it("returns relative Thai label for recent post", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatFeedPostTime(fiveMinAgo)).toMatch(/นาที/)
  })
})
