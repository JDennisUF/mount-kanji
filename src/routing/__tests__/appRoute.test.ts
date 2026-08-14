import { describe, expect, it } from "vitest";

import { parseAppRoute, serializeAppRoute } from "../appRoute";

describe("app route utilities", () => {
  it("parses a Base Camp intro route", () => {
    expect(parseAppRoute("?mount=base&screen=intro&intro=6")).toEqual({
      screen: "baseStudy",
      mount: "base",
      intro: 6,
    });
  });

  it("clamps invalid positive indexes to one", () => {
    expect(parseAppRoute("?mount=hiragana&screen=lesson&camp=0&step=-2")).toEqual({
      screen: "lesson",
      mount: "hiragana",
      camp: 1,
      step: 1,
    });
  });

  it("falls back from unknown mount and screen values", () => {
    expect(parseAppRoute("?mount=unknown&screen=elsewhere")).toEqual({
      screen: "dashboard",
      mount: "base",
    });
  });

  it("round-trips dictionary filters", () => {
    const route = parseAppRoute("?mount=kanji&screen=dictionary&q=mountain&radical=%E5%B1%B1&sumo=1&tags=n5,nature");

    expect(route).toEqual({
      screen: "dictionary",
      mount: "kanji",
      q: "mountain",
      radical: "山",
      sumoOnly: true,
      tags: ["n5", "nature"],
    });
    expect(parseAppRoute(serializeAppRoute(route))).toEqual(route);
  });

  it("round-trips Heya filters", () => {
    const route = parseAppRoute("?screen=sumo&q=yokozuna&category=ranks");

    expect(route).toEqual({
      screen: "sumo",
      q: "yokozuna",
      category: "ranks",
    });
    expect(parseAppRoute(serializeAppRoute(route))).toEqual(route);
  });

  it("serializes one-based lesson indexes", () => {
    expect(serializeAppRoute({ screen: "lesson", mount: "katakana", camp: 3, step: 2 })).toBe("?mount=katakana&screen=lesson&camp=3&step=2");
  });
});
