export interface SumoTerm {
  id: string;
  term: string;
  readingKana: string;
  readingRomaji: string;
  meaning: string;
  category: "basics" | "ranks" | "record" | "match" | "events";
}

export const sumoTerms: SumoTerm[] = [
  { id: "sumo_001", term: "相撲", readingKana: "すもう", readingRomaji: "sumo", meaning: "sumo wrestling", category: "basics" },
  { id: "sumo_002", term: "力士", readingKana: "りきし", readingRomaji: "rikishi", meaning: "sumo wrestler", category: "basics" },
  { id: "sumo_003", term: "場所", readingKana: "ばしょ", readingRomaji: "basho", meaning: "official tournament", category: "events" },
  { id: "sumo_004", term: "土俵", readingKana: "どひょう", readingRomaji: "dohyo", meaning: "sumo ring", category: "basics" },
  { id: "sumo_005", term: "番付", readingKana: "ばんづけ", readingRomaji: "banzuke", meaning: "ranking sheet", category: "ranks" },
  { id: "sumo_006", term: "取組", readingKana: "とりくみ", readingRomaji: "torikumi", meaning: "bout card or matchup", category: "match" },
  { id: "sumo_007", term: "勝", readingKana: "かち", readingRomaji: "kachi", meaning: "win", category: "record" },
  { id: "sumo_008", term: "負", readingKana: "まけ", readingRomaji: "make", meaning: "loss", category: "record" },
  { id: "sumo_009", term: "白星", readingKana: "しろぼし", readingRomaji: "shiroboshi", meaning: "win (white star)", category: "record" },
  { id: "sumo_010", term: "黒星", readingKana: "くろぼし", readingRomaji: "kuroboshi", meaning: "loss (black star)", category: "record" },
  { id: "sumo_011", term: "東", readingKana: "ひがし", readingRomaji: "higashi", meaning: "east side", category: "ranks" },
  { id: "sumo_012", term: "西", readingKana: "にし", readingRomaji: "nishi", meaning: "west side", category: "ranks" },
  { id: "sumo_013", term: "横綱", readingKana: "よこづな", readingRomaji: "yokozuna", meaning: "highest rank", category: "ranks" },
  { id: "sumo_014", term: "大関", readingKana: "おおぜき", readingRomaji: "ozeki", meaning: "second highest rank", category: "ranks" },
  { id: "sumo_015", term: "関脇", readingKana: "せきわけ", readingRomaji: "sekiwake", meaning: "senior champion rank", category: "ranks" },
  { id: "sumo_016", term: "小結", readingKana: "こむすび", readingRomaji: "komusubi", meaning: "junior champion rank", category: "ranks" },
  { id: "sumo_017", term: "前頭", readingKana: "まえがしら", readingRomaji: "maegashira", meaning: "top division rank-and-file", category: "ranks" },
  { id: "sumo_018", term: "十両", readingKana: "じゅうりょう", readingRomaji: "juryo", meaning: "second division", category: "ranks" },
  { id: "sumo_019", term: "幕下", readingKana: "まくした", readingRomaji: "makushita", meaning: "third division", category: "ranks" },
  { id: "sumo_020", term: "三段目", readingKana: "さんだんめ", readingRomaji: "sandanme", meaning: "fourth division", category: "ranks" },
  { id: "sumo_021", term: "序二段", readingKana: "じょにだん", readingRomaji: "jonidan", meaning: "fifth division", category: "ranks" },
  { id: "sumo_022", term: "序ノ口", readingKana: "じょのくち", readingRomaji: "jonokuchi", meaning: "entry division", category: "ranks" },
  { id: "sumo_023", term: "勝ち越し", readingKana: "かちこし", readingRomaji: "kachikoshi", meaning: "majority wins in tournament", category: "record" },
  { id: "sumo_024", term: "負け越し", readingKana: "まけこし", readingRomaji: "makekoshi", meaning: "majority losses in tournament", category: "record" },
  { id: "sumo_025", term: "休場", readingKana: "きゅうじょう", readingRomaji: "kyujo", meaning: "absence from tournament", category: "events" },
  { id: "sumo_026", term: "千秋楽", readingKana: "せんしゅうらく", readingRomaji: "senshuraku", meaning: "final day of tournament", category: "events" },
  { id: "sumo_027", term: "優勝", readingKana: "ゆうしょう", readingRomaji: "yusho", meaning: "tournament championship", category: "events" },
  { id: "sumo_028", term: "殊勲賞", readingKana: "しゅくんしょう", readingRomaji: "shukun-sho", meaning: "outstanding performance prize", category: "events" },
  { id: "sumo_029", term: "敢闘賞", readingKana: "かんとうしょう", readingRomaji: "kanto-sho", meaning: "fighting spirit prize", category: "events" },
  { id: "sumo_030", term: "技能賞", readingKana: "ぎのうしょう", readingRomaji: "gino-sho", meaning: "technique prize", category: "events" },
  { id: "sumo_031", term: "金星", readingKana: "きんぼし", readingRomaji: "kinboshi", meaning: "upset win over yokozuna", category: "record" },
  { id: "sumo_032", term: "立合い", readingKana: "たちあい", readingRomaji: "tachiai", meaning: "initial charge at bout start", category: "match" },
  { id: "sumo_033", term: "寄り切り", readingKana: "よりきり", readingRomaji: "yorikiri", meaning: "force out winning technique", category: "match" },
  { id: "sumo_034", term: "押し出し", readingKana: "おしだし", readingRomaji: "oshidashi", meaning: "push out winning technique", category: "match" },
  { id: "sumo_035", term: "上手投げ", readingKana: "うわてなげ", readingRomaji: "uwatenage", meaning: "overarm throw", category: "match" },
  { id: "sumo_036", term: "引き落とし", readingKana: "ひきおとし", readingRomaji: "hikiotoshi", meaning: "pull down technique", category: "match" },
  { id: "sumo_037", term: "叩き込み", readingKana: "はたきこみ", readingRomaji: "hatakikomi", meaning: "slap down technique", category: "match" },
  { id: "sumo_038", term: "土俵際", readingKana: "どひょうぎわ", readingRomaji: "dohyogiwa", meaning: "at the edge of the ring", category: "match" },
  { id: "sumo_039", term: "決まり手", readingKana: "きまりて", readingRomaji: "kimarite", meaning: "official winning technique", category: "match" },
  { id: "sumo_040", term: "物言い", readingKana: "ものいい", readingRomaji: "monoii", meaning: "judges conference", category: "events" },
  { id: "sumo_041", term: "行司", readingKana: "ぎょうじ", readingRomaji: "gyoji", meaning: "sumo referee", category: "basics" },
  { id: "sumo_042", term: "呼出", readingKana: "よびだし", readingRomaji: "yobidashi", meaning: "ring caller and staff", category: "basics" },
  { id: "sumo_043", term: "懸賞", readingKana: "けんしょう", readingRomaji: "kensho", meaning: "sponsor prize envelope", category: "events" },
  { id: "sumo_044", term: "塩", readingKana: "しお", readingRomaji: "shio", meaning: "purification salt", category: "basics" },
  { id: "sumo_045", term: "四股", readingKana: "しこ", readingRomaji: "shiko", meaning: "stomping warm-up exercise", category: "basics" }
];
