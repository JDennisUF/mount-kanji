import type { StudyTrack } from "../types";

export type RouteMount = "base" | StudyTrack;
export type RouteScreen = "dashboard" | "baseStudy" | "lesson" | "quiz" | "handwriting" | "context" | "summary" | "dictionary" | "progress" | "sumo" | "settings";
export type RouteSumoCategory = "all" | "basics" | "events" | "ranks" | "match" | "record";

export type AppRoute =
  | { screen: "dashboard"; mount: RouteMount; camp?: number; intro?: number }
  | { screen: "baseStudy"; mount: "base"; intro: number }
  | { screen: "lesson"; mount: StudyTrack; camp: number; step: number }
  | { screen: "quiz"; mount: StudyTrack; camp: number; q: number }
  | { screen: "handwriting"; mount: "hiragana" | "katakana"; camp: number; step: number }
  | { screen: "context"; mount: StudyTrack; camp: number; step: number }
  | { screen: "summary"; mount: StudyTrack; camp: number }
  | { screen: "dictionary"; mount: StudyTrack; q?: string; radical?: string; sumoOnly?: boolean; tags?: string[] }
  | { screen: "progress"; mount?: StudyTrack }
  | { screen: "sumo"; q?: string; category?: RouteSumoCategory }
  | { screen: "settings" };

const STUDY_TRACKS = new Set<StudyTrack>(["kanji", "hiragana", "katakana"]);
const MOUNTS = new Set<RouteMount>(["base", "kanji", "hiragana", "katakana"]);
const SUMO_CATEGORIES = new Set<RouteSumoCategory>(["all", "basics", "events", "ranks", "match", "record"]);

export const DEFAULT_APP_ROUTE: AppRoute = { screen: "dashboard", mount: "base" };

function parsePositiveInteger(value: string | null, fallback = 1): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function parseOptionalPositiveInteger(value: string | null): number | undefined {
  return value === null ? undefined : parsePositiveInteger(value);
}

function parseMount(value: string | null): RouteMount {
  return value && MOUNTS.has(value as RouteMount) ? (value as RouteMount) : "base";
}

function parseStudyTrack(value: string | null, fallback: StudyTrack = "hiragana"): StudyTrack {
  return value && STUDY_TRACKS.has(value as StudyTrack) ? (value as StudyTrack) : fallback;
}

function parseTags(value: string | null): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return tags.length > 0 ? tags : undefined;
}

function setIfPresent(params: URLSearchParams, key: string, value: string | number | undefined) {
  if (value !== undefined && `${value}` !== "") {
    params.set(key, `${value}`);
  }
}

export function parseAppRoute(search: string): AppRoute {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const screen = params.get("screen") ?? "dashboard";
  const mount = parseMount(params.get("mount"));

  switch (screen) {
    case "intro":
    case "baseStudy":
      return { screen: "baseStudy", mount: "base", intro: parsePositiveInteger(params.get("intro")) };
    case "lesson":
      return {
        screen: "lesson",
        mount: parseStudyTrack(params.get("mount")),
        camp: parsePositiveInteger(params.get("camp")),
        step: parsePositiveInteger(params.get("step")),
      };
    case "quiz":
      return {
        screen: "quiz",
        mount: parseStudyTrack(params.get("mount")),
        camp: parsePositiveInteger(params.get("camp")),
        q: parsePositiveInteger(params.get("q")),
      };
    case "handwriting": {
      const handwritingMount = parseStudyTrack(params.get("mount")) === "katakana" ? "katakana" : "hiragana";
      return {
        screen: "handwriting",
        mount: handwritingMount,
        camp: parsePositiveInteger(params.get("camp")),
        step: parsePositiveInteger(params.get("step")),
      };
    }
    case "context":
      return {
        screen: "context",
        mount: parseStudyTrack(params.get("mount")),
        camp: parsePositiveInteger(params.get("camp")),
        step: parsePositiveInteger(params.get("step")),
      };
    case "summary":
      return {
        screen: "summary",
        mount: parseStudyTrack(params.get("mount")),
        camp: parsePositiveInteger(params.get("camp")),
      };
    case "dictionary":
      return {
        screen: "dictionary",
        mount: parseStudyTrack(params.get("mount")),
        q: params.get("q") ?? undefined,
        radical: params.get("radical") ?? undefined,
        sumoOnly: params.get("sumo") === "1" ? true : undefined,
        tags: parseTags(params.get("tags")),
      };
    case "progress": {
      const route: AppRoute = { screen: "progress" };
      const track = params.get("mount");
      if (track && STUDY_TRACKS.has(track as StudyTrack)) {
        route.mount = track as StudyTrack;
      }
      return route;
    }
    case "sumo": {
      const category = params.get("category");
      return {
        screen: "sumo",
        q: params.get("q") ?? undefined,
        category: category && SUMO_CATEGORIES.has(category as RouteSumoCategory) ? (category as RouteSumoCategory) : undefined,
      };
    }
    case "settings":
      return { screen: "settings" };
    case "dashboard":
      return {
        screen: "dashboard",
        mount,
        camp: parseOptionalPositiveInteger(params.get("camp")),
        intro: parseOptionalPositiveInteger(params.get("intro")),
      };
    default:
      return DEFAULT_APP_ROUTE;
  }
}

export function serializeAppRoute(route: AppRoute): string {
  const params = new URLSearchParams();

  switch (route.screen) {
    case "dashboard":
      params.set("mount", route.mount);
      if (route.mount === "base") {
        setIfPresent(params, "intro", route.intro);
      } else {
        setIfPresent(params, "camp", route.camp);
      }
      break;
    case "baseStudy":
      params.set("mount", "base");
      params.set("screen", "intro");
      params.set("intro", `${route.intro}`);
      break;
    case "lesson":
      params.set("mount", route.mount);
      params.set("screen", "lesson");
      params.set("camp", `${route.camp}`);
      params.set("step", `${route.step}`);
      break;
    case "quiz":
      params.set("mount", route.mount);
      params.set("screen", "quiz");
      params.set("camp", `${route.camp}`);
      params.set("q", `${route.q}`);
      break;
    case "handwriting":
      params.set("mount", route.mount);
      params.set("screen", "handwriting");
      params.set("camp", `${route.camp}`);
      params.set("step", `${route.step}`);
      break;
    case "context":
      params.set("mount", route.mount);
      params.set("screen", "context");
      params.set("camp", `${route.camp}`);
      params.set("step", `${route.step}`);
      break;
    case "summary":
      params.set("mount", route.mount);
      params.set("screen", "summary");
      params.set("camp", `${route.camp}`);
      break;
    case "dictionary":
      params.set("mount", route.mount);
      params.set("screen", "dictionary");
      setIfPresent(params, "q", route.q);
      setIfPresent(params, "radical", route.radical);
      if (route.sumoOnly) {
        params.set("sumo", "1");
      }
      if (route.tags && route.tags.length > 0) {
        params.set("tags", route.tags.join(","));
      }
      break;
    case "progress":
      params.set("screen", "progress");
      setIfPresent(params, "mount", route.mount);
      break;
    case "sumo":
      params.set("screen", "sumo");
      setIfPresent(params, "q", route.q);
      setIfPresent(params, "category", route.category);
      break;
    case "settings":
      params.set("screen", "settings");
      break;
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}
