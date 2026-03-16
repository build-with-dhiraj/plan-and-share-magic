import { describe, it, expect } from "vitest";
import { normalizeTag, normalizeAndDedup, dedupeTagsAgainstPapers } from "@/lib/tags";

describe("normalizeTag", () => {
  it("maps direct canonical names", () => {
    expect(normalizeTag("Polity")).toBe("polity");
    expect(normalizeTag("Economy")).toBe("economy");
    expect(normalizeTag("Science")).toBe("science");
  });

  it("maps abbreviations and synonyms", () => {
    expect(normalizeTag("S&T")).toBe("science");
    expect(normalizeTag("IR")).toBe("ir");
    expect(normalizeTag("Art & Culture")).toBe("history");
    expect(normalizeTag("Governance")).toBe("polity");
  });

  it("maps organization names to their subject (entity linking)", () => {
    expect(normalizeTag("ISRO")).toBe("science");
    expect(normalizeTag("Indian Space Research Organisation")).toBe("science");
    expect(normalizeTag("DRDO")).toBe("science");
    expect(normalizeTag("RBI")).toBe("economy");
    expect(normalizeTag("NITI Aayog")).toBe("polity");
  });

  it("returns null for unknown tags", () => {
    expect(normalizeTag("")).toBeNull();
    expect(normalizeTag("   ")).toBeNull();
    expect(normalizeTag("RandomNonsense")).toBeNull();
  });
});

describe("normalizeAndDedup", () => {
  it("collapses duplicate canonical references", () => {
    expect(normalizeAndDedup(["Science", "S&T", "Science"])).toEqual(["science"]);
  });

  it("collapses entity names to their subject", () => {
    expect(normalizeAndDedup(["ISRO", "Indian Space Research Organisation"])).toEqual(["science"]);
  });

  it("preserves distinct subjects", () => {
    expect(normalizeAndDedup(["Polity", "Economy"])).toEqual(["polity", "economy"]);
  });

  it("handles empty array", () => {
    expect(normalizeAndDedup([])).toEqual([]);
  });

  it("handles mixed valid and invalid tags", () => {
    expect(normalizeAndDedup(["Science", "RandomJunk", "Polity"])).toEqual(["science", "polity"]);
  });

  it("deduplicates S&T variants (the original bug)", () => {
    // This was the original bug: S&T tag appeared 4 times
    expect(normalizeAndDedup(["S&T", "Science", "Science & Tech", "Science and Technology"])).toEqual(["science"]);
  });
});

describe("dedupeTagsAgainstPapers", () => {
  it("keeps tags when papers list is empty", () => {
    expect(dedupeTagsAgainstPapers(["polity", "economy"], [])).toEqual(["polity", "economy"]);
  });

  it("removes essay tag when Essay paper is shown", () => {
    expect(dedupeTagsAgainstPapers(["essay", "polity"], ["Essay"])).toEqual(["polity"]);
  });

  it("keeps single tag even with matching paper", () => {
    expect(dedupeTagsAgainstPapers(["polity"], ["GS-2"])).toEqual(["polity"]);
  });
});
