import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const EXISTING_BASE = new Set([
  "日", "一", "国", "人", "年", "大", "十", "二", "本", "中", "長", "出", "三", "時", "行", "見", "月", "後", "前", "生",
  "五", "間", "上", "東", "四", "今", "金", "九", "入", "学", "高", "円", "子", "外", "八", "六", "下", "来", "気", "小",
  "七", "山", "話", "女", "北", "午", "百", "書", "先", "名", "川", "千", "水", "半", "男", "西", "電", "校", "語", "土",
  "木", "聞", "食", "車", "何", "南", "万", "毎", "白", "天", "母", "火", "右", "読", "友", "左", "休", "父", "雨", "会",
  "同", "事", "自", "社", "発", "者", "地", "業", "開", "手", "力", "問", "代", "明", "動", "京", "目", "通", "言", "理",
]);

const LEVELS = [4, 3, 2, 1];
const TARGET_FILE = new URL("../src/data/seed/jlptSupplement.ts", import.meta.url);
const UNIHAN_URL = "https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip";
const KANGXI_RADICALS = Array.from({ length: 214 }, (_, index) => String.fromCodePoint(0x2f00 + index));
const RADICAL_DISPLAY_VARIANTS = new Map([
  ["⾡", "辶"],
]);
const execFileAsync = promisify(execFile);

function normalizeReading(reading) {
  return reading === "" ? "-" : reading.replaceAll(".", "");
}

function toPrimaryMeaning(data) {
  return data.heisig_en ?? data.meanings[0] ?? "unknown";
}

function toRow(data, radical) {
  return {
    character: data.kanji,
    primaryMeaning: toPrimaryMeaning(data),
    meanings: data.meanings,
    onyomi: data.on_readings.length > 0 ? data.on_readings : ["-"],
    kunyomi: data.kun_readings.length > 0 ? data.kun_readings.map(normalizeReading) : ["-"],
    strokeCount: data.stroke_count,
    radical,
  };
}

async function fetchRadicalsByCharacter() {
  const directory = await mkdtemp(join(tmpdir(), "mount-kanji-unihan-"));
  const archivePath = join(directory, "Unihan.zip");

  try {
    const response = await fetch(UNIHAN_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Unihan data: ${response.status}`);
    }

    await writeFile(archivePath, Buffer.from(await response.arrayBuffer()));
    const { stdout } = await execFileAsync("unzip", ["-p", archivePath, "Unihan_IRGSources.txt"], {
      maxBuffer: 20 * 1024 * 1024,
    });
    const radicalsByCharacter = new Map();

    for (const line of stdout.split("\n")) {
      const match = /^U\+([0-9A-F]+)\tkRSUnicode\t(\d+)/.exec(line);
      if (!match) {
        continue;
      }

      const radical = KANGXI_RADICALS[Number(match[2]) - 1];
      if (!radical) {
        throw new Error(`Unsupported radical number ${match[2]} for U+${match[1]}`);
      }
      radicalsByCharacter.set(String.fromCodePoint(Number.parseInt(match[1], 16)), RADICAL_DISPLAY_VARIANTS.get(radical) ?? radical);
    }

    return radicalsByCharacter;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function toTs(rowsByLevel) {
  const header = [
    "type SupplementSeedRow = {",
    "  character: string;",
    "  primaryMeaning: string;",
    "  meanings: string[];",
    "  onyomi: string[];",
    "  kunyomi: string[];",
    "  strokeCount: number;",
    "  radical: string;",
    "  jlptLevel: \"N4\" | \"N3\" | \"N2\" | \"N1\";",
    "  tags: string[];",
    "  sumoRelevant?: boolean;",
    "};",
    "",
  ];

  const body = LEVELS.flatMap((level) => {
    const levelKey = `N${level}`;
    const constName = `n${level}SupplementRows`;
    const rows = rowsByLevel[levelKey];
    return [
      `const ${constName}: SupplementSeedRow[] = [`,
      ...rows.map((row) => {
        const values = JSON.stringify(row);
        return `  ${values},`;
      }),
      "];",
      "",
    ];
  });

  const footer = [
    "export const jlptSupplementRows: SupplementSeedRow[] = [",
    ...LEVELS.map((level) => `  ...n${level}SupplementRows,`),
    "];",
    "",
  ];

  return [...header, ...body, ...footer].join("\n");
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

async function main() {
  const seen = new Set(EXISTING_BASE);
  const rowsByLevel = Object.fromEntries(LEVELS.map((level) => [`N${level}`, []]));
  const radicalsByCharacter = await fetchRadicalsByCharacter();

  for (const level of LEVELS) {
    const levelKey = `N${level}`;
    const characters = await fetchJson(`https://kanjiapi.dev/v1/kanji/jlpt-${level}`);

    for (const character of characters) {
      if (seen.has(character)) {
        continue;
      }

      const data = await fetchJson(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(character)}`);
      const radical = radicalsByCharacter.get(character);
      if (!radical) {
        throw new Error(`No Unicode radical found for ${character}`);
      }
      const row = toRow(data, radical);
      rowsByLevel[levelKey].push({
        ...row,
        jlptLevel: levelKey,
        tags: ["jlpt", levelKey.toLowerCase()],
      });
      seen.add(character);
    }
  }

  await writeFile(TARGET_FILE, `${toTs(rowsByLevel)}`, "utf8");

  console.log(
    JSON.stringify(
      {
        n4Added: rowsByLevel.N4.length,
        n3Added: rowsByLevel.N3.length,
        n2Added: rowsByLevel.N2.length,
        n1Added: rowsByLevel.N1.length,
        totalAdded: Object.values(rowsByLevel).reduce((total, rows) => total + rows.length, 0),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
