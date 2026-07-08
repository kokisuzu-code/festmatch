export const PREFECTURES = [
  { slug: "hokkaido", name: "北海道" }, { slug: "aomori", name: "青森県" },
  { slug: "iwate", name: "岩手県" }, { slug: "miyagi", name: "宮城県" },
  { slug: "akita", name: "秋田県" }, { slug: "yamagata", name: "山形県" },
  { slug: "fukushima", name: "福島県" }, { slug: "ibaraki", name: "茨城県" },
  { slug: "tochigi", name: "栃木県" }, { slug: "gunma", name: "群馬県" },
  { slug: "saitama", name: "埼玉県" }, { slug: "chiba", name: "千葉県" },
  { slug: "tokyo", name: "東京都" }, { slug: "kanagawa", name: "神奈川県" },
  { slug: "niigata", name: "新潟県" }, { slug: "toyama", name: "富山県" },
  { slug: "ishikawa", name: "石川県" }, { slug: "fukui", name: "福井県" },
  { slug: "yamanashi", name: "山梨県" }, { slug: "nagano", name: "長野県" },
  { slug: "gifu", name: "岐阜県" }, { slug: "shizuoka", name: "静岡県" },
  { slug: "aichi", name: "愛知県" }, { slug: "mie", name: "三重県" },
  { slug: "shiga", name: "滋賀県" }, { slug: "kyoto", name: "京都府" },
  { slug: "osaka", name: "大阪府" }, { slug: "hyogo", name: "兵庫県" },
  { slug: "nara", name: "奈良県" }, { slug: "wakayama", name: "和歌山県" },
  { slug: "tottori", name: "鳥取県" }, { slug: "shimane", name: "島根県" },
  { slug: "okayama", name: "岡山県" }, { slug: "hiroshima", name: "広島県" },
  { slug: "yamaguchi", name: "山口県" }, { slug: "tokushima", name: "徳島県" },
  { slug: "kagawa", name: "香川県" }, { slug: "ehime", name: "愛媛県" },
  { slug: "kochi", name: "高知県" }, { slug: "fukuoka", name: "福岡県" },
  { slug: "saga", name: "佐賀県" }, { slug: "nagasaki", name: "長崎県" },
  { slug: "kumamoto", name: "熊本県" }, { slug: "oita", name: "大分県" },
  { slug: "miyazaki", name: "宮崎県" }, { slug: "kagoshima", name: "鹿児島県" },
  { slug: "okinawa", name: "沖縄県" },
] as const;

export type Prefecture = (typeof PREFECTURES)[number];

export function findPrefectureBySlug(slug: string): Prefecture | undefined {
  return PREFECTURES.find((p) => p.slug === slug);
}
