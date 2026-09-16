# FestMatch — Codex 向け包括仕様書

更新日: 2026-07-20  
対象: 新規構築する FestMatch のプロダクト、データベース、決済、公開サイト  
この文書は、過去の試作実装や断片的な指示に依存せず、Codex がゼロから段階的に実装するための唯一の仕様書です。

## 0. Codex への実行指示

この文書の Phase 0 から順に実装すること。各 Phase の受け入れ基準を満たし、型検査・lint・build・該当テストが通ってから次の Phase に進むこと。

既存リポジトリに試作コード、未コミット変更、古いマイグレーションが存在しても、削除・上書き・リセットを勝手に行わない。まず現状を読み、今回の新規実装と衝突する場合は、新しい作業領域または明確に隔離した新規ルートを使う。ユーザーの明示的な承認なしに `git reset`、既存データの削除、外部サービスの本番変更をしてはならない。

実装中に必要な認証情報、Stripe/Supabase/Resend の実プロジェクト設定、送信ドメイン、決済商品の Price ID だけはユーザーに確認する。それ以外は、この仕様に基づいて合理的に実装を進める。

## 1. プロダクト概要

FestMatch は、イベント主催者とフード・ドリンク等の出店ベンダーをつなぐ日本向け SaaS である。主催者はイベントを登録して募集を作成し、ベンダーは条件に合うイベントへ応募する。応募・選考・決済・出店後の売上記録までを一つのサービスで扱う。

公開面として、全国のイベントを閲覧できる FestMap を提供する。FestMap はイベント探しとベンダー発見の入口であり、主催者の募集導線とベンダーのプロフィール導線を兼ねる。

### 利用者

| ロール | 主な目的 |
| --- | --- |
| 主催者 | イベント作成、募集、応募管理、出店料受領、集計確認 |
| ベンダー | プロフィール作成、イベント検索、応募、決済、売上記録 |
| 運営管理者 | 外部イベントの登録・編集、公開内容の管理、問い合わせ対応 |
| 未ログイン閲覧者 | FestMap と公開ベンダープロフィールの閲覧 |

## 2. 絶対原則

以下は設計・文言・実装のすべてで守る。仕様間に矛盾がある場合は、この節を優先する。

1. 主催者は有料顧客である。「主催者無料」「主催者は無料で利用可能」といった表現を UI、SEO、営業文言、コードコメントに書かない。
2. 無料ベンダーもイベントへ応募できる。ベンダーのサブスクリプションは応募そのもの、基本的なプロフィール、応募状況の確認をゲートしない。
3. 主催者は特定ベンダーの売上を絶対に閲覧できない。RLS だけに頼らず、主催者向け集計は個社を含まない専用ビュー/API から返す。集計母数が 3 社未満のジャンルは表示しない。
4. イベント終了、募集締切、手数料、プラン特典の判定は、原則リクエスト時に計算する。時刻経過だけを理由とする一括更新ジョブや状態同期を前提にしない。
5. UI の本文に絵文字を使わない。表示フォントに明朝体・serif を使わない。ベンダーの呼称は常に「ベンダー」とし、「キッチンカーオーナー」と表記しない。
6. 外部イベントは主催者の公式サイト・自治体・公式 SNS 等の事実確認できる情報だけを手入力で登録する。チケットサイトのスクレイピング、推測による日程・料金補完はしない。外部リンクには `rel="nofollow noopener noreferrer"` を付与する。
7. 「No.1」「必ず集客できる」など根拠を示せない優位性・成果を断言しない。

## 3. 料金とビジネスルール

金額はすべて税込表示を前提とし、決済時に金額・税の扱いを明示する。通貨は初期リリースでは JPY のみ。

### 主催者料金

| プラン | 料金 | 内容 |
| --- | ---: | --- |
| 年間契約 | 年額 120,000 円 | 月額換算 10,000 円。イベント作成・募集・応募管理を含む |
| スポット利用 | 1 イベント 250,000 円 | 利用期間はイベント終了後を含め最大 3 か月 |

主催者料金の請求書払い、銀行振込、許可証管理は今回のスコープ外である。支払い済み主催者だけが募集を公開できる設計にするが、公開前の下書き作成は許可する。

### ベンダー料金

| プラン | 年額 | 応募 | プラットフォーム手数料の割引 |
| --- | ---: | --- | ---: |
| Free | 0 円 | 可能 | なし |
| Light | 30,000 円 | 可能 | 10% 割引 |
| Standard | 80,000 円 | 可能 | 30% 割引 |
| Pro | 150,000 円 | 可能 | 50% 割引 |

プラットフォームの基準応募手数料は、出店料の 10% とする。割引率はアプリケーション設定の定数として保持し、決済時にサーバー側でのみ計算する。クライアントが金額、手数料、割引率を決定してはならない。

```ts
// 例: サーバー専用の料金設定
export const VENDOR_TIER_DISCOUNT = {
  free: 0,
  light: 0.1,
  standard: 0.3,
  pro: 0.5,
} as const;

export const PLATFORM_APPLICATION_FEE_RATE = 0.1;
```

Free のベンダーに応募不可、検索非表示、基本プロフィール非公開などの機能制限を加えてはならない。Pro の初期特典は、公開プロフィール URL と掲載写真数の拡張であり、応募資格の差にはしない。

## 4. 技術方針

| 領域 | 採用方針 |
| --- | --- |
| フロントエンド | 現行安定版の Next.js App Router、TypeScript、Tailwind CSS |
| UI | React Server Components を基本にし、入力・地図・決済遷移だけを必要最小限の Client Component にする |
| 認証・DB・ストレージ | Supabase Auth、Postgres、Storage。全テーブルで RLS を有効化する |
| 決済 | Stripe Connect Express、Stripe Checkout、Stripe Billing、Webhook |
| メール | Resend。認証用メールは Supabase Auth の設定と責務を重複させない |
| 地図 | Leaflet と OpenStreetMap。地図タイルの利用規約・帰属表示を守る |
| ホスティング | Vercel。機密値は Vercel/Supabase/Stripe の環境変数にのみ置く |
| テスト | Vitest を中心としたユニット・統合テスト、Playwright の主要導線 E2E、Supabase ローカル環境での RLS 検証 |

Next.js のメジャーバージョンを古い仕様に合わせて無理に下げない。開始時点のプロジェクトの安定版・Node.js 要件を確認し、依存関係を互換性のある組み合わせに固定する。

### 必須環境変数

`.env.local.example` をコミットし、実値を含む `.env.local` はコミットしない。

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_VENDOR_LIGHT_PRICE_ID=
STRIPE_VENDOR_STANDARD_PRICE_ID=
STRIPE_VENDOR_PRO_PRICE_ID=
STRIPE_ORGANIZER_ANNUAL_PRICE_ID=

RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

`SUPABASE_SERVICE_ROLE_KEY`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`RESEND_API_KEY` はサーバー専用である。`NEXT_PUBLIC_` を付ける、クライアントコンポーネントへ渡す、ログへ出力する、ブラウザに埋め込む行為を禁止する。

### 外部サービスの初期設定

実装を開始する前に、以下の順で開発用の外部サービスを準備する。本番のキー・本番 Webhook は、テスト環境での受け入れ基準を通過してから設定する。

#### Supabase

1. 対象プロジェクトを決め、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、`SUPABASE_SERVICE_ROLE_KEY` を取得する。既存プロジェクトの legacy anon key は移行期間だけ `NEXT_PUBLIC_SUPABASE_ANON_KEY` に設定する。
2. Supabase CLI にログインし、対象プロジェクトへリンクする。
3. 生成・レビュー済みのマイグレーションだけを適用する。既存の別プロジェクトや本番 DB に、内容未確認の `db push` を行わない。

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

CLI を使えない場合は、対象マイグレーションをレビューしたうえで Supabase Dashboard の SQL Editor から適用する。どちらの場合も、適用直後にテーブル、RLS、ビュー、Storage ポリシーを検証する。

#### Stripe

1. まずテストモードの `sk_test_...` と `pk_test_...` を使う。
2. Stripe Dashboard で Connect Express を有効化する。
3. ベンダー向け Light / Standard / Pro の Product と recurring Price を作り、各 Price ID を環境変数へ設定する。
4. Webhook の受信 URL は `/api/webhooks/stripe` に統一する。ローカル検証では次を使い、表示された `whsec_...` を `STRIPE_WEBHOOK_SECRET` に設定する。

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

本番デプロイ後は、本番 URL の同じエンドポイントを Stripe Dashboard に別途登録する。テスト用と本番用の Webhook secret を混在させない。

#### Resend と認証メール

送信ドメインを Resend で認証する。ログインメールを Supabase Auth SMTP 経由で送るのか、アプリの Resend 経由で送るのかを設計時に一方へ決め、同じマジックリンクを二重送信しない。認証メールに使う送信元は `RESEND_FROM_EMAIL` として明示する。

## 5. 情報設計と画面

### URL と画面一覧

| URL | 目的 | 主な閲覧者 |
| --- | --- | --- |
| `/` | サービス説明、主催者・ベンダーへの導線、FestMap への導線 | 全員 |
| `/login` | マジックリンクログイン | 未ログイン |
| `/signup` | ロール選択を伴う初回登録 | 未ログイン |
| `/organizer` | 主催者ダッシュボード | 主催者 |
| `/organizer/events/new` | イベント作成 | 主催者 |
| `/organizer/events/[id]` | イベント編集、応募一覧、集計 | 所有主催者 |
| `/vendor` | ベンダーダッシュボード | ベンダー |
| `/vendor/profile` | 公開プロフィール編集 | ベンダー |
| `/vendor/events` | 募集中イベント検索・応募 | ベンダー |
| `/vendor/applications` | 応募状況・決済状況 | ベンダー |
| `/pricing` | 主催者・ベンダー料金 | 全員 |
| `/festmap` | 全国のイベント地図・一覧 | 全員 |
| `/festmap/[prefecture]` | 都道府県別 FestMap | 全員 |
| `/festmap/events/[slug]` | 公開イベント詳細 | 全員 |
| `/festmap/vendors/[slug]` | 公開ベンダープロフィール | 全員 |
| `/embed/events/[slug]` | 主催者サイト埋め込み用の募集カード | 外部閲覧者 |
| `/apply/[slug]` | 未認証応募のメール認証・引き継ぎ導線 | 外部応募者 |
| `/admin/external-events` | 外部イベントの管理 | 運営管理者 |

ルート保護はミドルウェアまたは同等のサーバー処理で行う。ログイン済みでもロールが違うダッシュボードには入れない。リダイレクトだけで済ませず、各データ取得・更新でも所有者とロールを検査する。

### デザインシステム

| トークン | 値 | 用途 |
| --- | --- | --- |
| `--paper` | `#FDFBF6` | 背景 |
| `--ink` | `#1F2A44` | 本文、濃色面 |
| `--shu` | `#D93A2B` | 主要 CTA、重要状態 |
| `--lantern` | `#F5A623` | 地図ピン、補助アクセント |

フォントは Noto Sans JP または同等の読みやすいサンセリフを使い、見出しは `font-weight: 900` を基本とする。和文の字詰めは必要に応じ `font-feature-settings: "palt"` を使う。コントラスト、キーボード操作、フォームラベル、エラー文を WCAG 2.1 AA 相当で整える。

- 主催者ダッシュボードは淡色面を基本とし、デスクトップ・タブレットでは左サイドバーを固定する。モバイルでは下部ナビゲーションに置き換える。
- ベンダーダッシュボードは濃色面を基本とし、モバイル・タブレットでは下部ナビゲーション、デスクトップでは中央寄せのコンテンツレイアウトにする。
- FestMap は淡色面を基本にする。内部イベントは提灯をモチーフにした SVG ピン、外部イベントは破線のカードで区別する。
- アイコンは SVG または既存のアイコンライブラリを使う。絵文字を UI アイコンとして使わない。

## 6. ドメインモデル

### 共通の列・規約

- 主キーは UUID とする。
- 時刻は Postgres の `timestamptz`、アプリでは ISO 8601 と JST 表示を使う。
- 外部公開 URL はランダム値ではなく検証済み slug を使う。slug は公開後に不用意に変更しない。
- 監査上必要な `created_at` と `updated_at` を持つ。`updated_at` は更新トリガーで保つ。
- 金額は JPY の整数（円）で持つ。小数・浮動小数点で金額を持たない。
- 列挙値には Postgres enum または CHECK 制約を使い、クライアントだけのバリデーションにしない。

### テーブル

#### `profiles`

Auth ユーザーとアプリ上のロールを結ぶ最小テーブル。

| 列 | 内容 |
| --- | --- |
| `id` | `auth.users.id` を参照する主キー |
| `role` | `organizer` / `vendor` / `admin` |
| `display_name` | 表示名 |
| `created_at`, `updated_at` | 監査時刻 |

ロールは `user_metadata` ではなくこのテーブルとサーバー側の認可で判定する。ユーザー自身がクライアントから `role = admin` に変更できるポリシーを作らない。

#### `organizers`

| 列 | 内容 |
| --- | --- |
| `id` | 主キー |
| `profile_id` | 所有する `profiles.id`、一意 |
| `organization_name` | 団体名 |
| `contact_name`, `contact_email`, `contact_phone` | 連絡先 |
| `billing_plan` | `annual` または `NULL`。Spot はアカウント全体のプランとして保持しない |
| `billing_status` | 年間契約の `draft` / `active` / `past_due` / `canceled` |
| `stripe_customer_id`, `stripe_subscription_id` | Stripe 顧客・年間契約 ID。公開 API から除外 |

#### `organizer_spot_contracts`

| 列 | 内容 |
| --- | --- |
| `organizer_id`, `event_id` | 購入主催者と対象イベント。`event_id` は一意 |
| `amount_yen` | 常に 250,000 円 |
| `status` | `pending` / `active` / `expired` / `refunded` |
| `stripe_checkout_session_id`, `stripe_payment_intent_id` | 一括決済の照合用 ID。公開 API から除外 |
| `access_ends_at` | 決済日から最大 3 か月の利用期限 |

Spot の一括決済が完了すると、期限内に限り対応する `event_id` だけを公開できる。主催者アカウント全体の公開権限にはしない。

#### `vendors`

このテーブルには公開プロフィールに必要な情報だけを置く。決済 ID や売上は置かない。

| 列 | 内容 |
| --- | --- |
| `id` | 主キー |
| `profile_id` | 所有する `profiles.id`、一意 |
| `name` | 屋号 |
| `slug` | 公開 URL 用、一意 |
| `genre` | ジャンル |
| `description` | 紹介文 |
| `prefecture` | 主な活動都道府県 |
| `website_url`, `instagram_url` | 任意の公開リンク。URL 検証する |
| `photo_paths` | Supabase Storage 上の公開写真パス。配列上限をプランで検証 |
| `subscription_tier` | `free` / `light` / `standard` / `pro` |
| `is_public` | 公開プロフィールの可否 |

#### `vendor_billing`

ベンダーごとの Stripe 関連情報を公開プロフィールから物理的に分離する。

| 列 | 内容 |
| --- | --- |
| `vendor_id` | `vendors.id` を参照する主キー |
| `stripe_customer_id` | Billing 顧客 ID |
| `stripe_subscription_id` | Billing 契約 ID |
| `subscription_status` | Stripe と同期した状態 |
| `stripe_connect_account_id` | Connect Express アカウント ID |
| `connect_onboarding_complete` | 本人確認完了フラグ |

#### `events`

| 列 | 内容 |
| --- | --- |
| `id`, `organizer_id` | 識別子と所有主催者 |
| `title`, `slug`, `description` | 公開基本情報 |
| `prefecture`, `address` | 会場情報 |
| `latitude`, `longitude` | 地図表示用座標。範囲制約を付ける |
| `starts_at`, `ends_at`, `application_deadline_at` | 日時 |
| `booth_fee_yen` | 出店料 |
| `capacity` | 募集上限 |
| `accepted_count` | 保存せず、必要時に承認済み応募から計算するか整合性を保証する集計を使用 |
| `status` | `draft` / `published` / `canceled` |
| `cover_photo_path` | 公開カバー画像 |

イベントが終了済みかは `ends_at < now()`、応募締切済みかは `application_deadline_at < now()` で判定する。時刻を待って `ended` へ一括更新する設計にしない。

#### `applications`

| 列 | 内容 |
| --- | --- |
| `id`, `event_id`, `vendor_id` | 識別子と関係 |
| `status` | `pending` / `approved` / `rejected` / `cancelled` / `paid` |
| `message` | ベンダーから主催者への応募文 |
| `approved_at`, `rejected_at`, `paid_at` | 状態遷移の時刻 |
| `stripe_checkout_session_id`, `stripe_payment_intent_id` | 決済照合用。ベンダー本人とサーバーだけが扱う |
| `platform_fee_yen`, `booth_fee_yen_snapshot` | 決済時の再現性に必要な金額スナップショット |

`(event_id, vendor_id)` は一意にする。応募は公開中かつ未終了かつ締切前のイベントにだけ作成できる。承認数が `capacity` を超えないことはトランザクションまたは DB 関数で保証する。

#### `sales_records`

ベンダー自身の任意入力または将来の連携用の売上記録。主催者に個別レコードを返してはならない。

| 列 | 内容 |
| --- | --- |
| `id`, `vendor_id`, `event_id` | 識別子と関係 |
| `sales_date` | 対象日 |
| `gross_sales_yen` | 売上額 |
| `source` | `manual` 等の入力元 |

#### `pending_applications`

埋め込みフォーム等で認証前に応募意思を受け付ける短命の中間レコード。

| 列 | 内容 |
| --- | --- |
| `id`, `event_id` | 識別子と対象イベント |
| `email` | 正規化したメールアドレス |
| `vendor_name`, `genre`, `message` | 最小限の応募情報 |
| `claim_token_hash` | 生トークンではなくハッシュ |
| `expires_at`, `claimed_at` | 失効・引き継ぎ管理 |

#### `external_events`

運営が公式情報から手入力する外部イベント。FestMatch 内の応募・決済には接続しない。

| 列 | 内容 |
| --- | --- |
| `id`, `slug`, `title`, `description` | 公開情報 |
| `prefecture`, `address`, `latitude`, `longitude` | 会場情報 |
| `starts_at`, `ends_at` | 開催日時 |
| `official_url`, `source_url` | 公式 URL と確認元 URL |
| `verified_at`, `verified_by` | 確認監査情報 |
| `status` | `draft` / `published` / `archived` |

### 参照用ビュー

公開・集計用には、必要列だけを返すビューを用いる。`SELECT *` は禁止する。

#### `vendors_public`

公開可能な `vendors` のみを返し、`id`, `name`, `slug`, `genre`, `description`, `prefecture`, `website_url`, `instagram_url`, `photo_paths`, `subscription_tier`, `created_at` に限定する。メールアドレス、電話番号、Stripe ID、応募、売上、非公開メモは絶対に含めない。

#### `organizer_event_genre_stats`

イベント単位・ジャンル単位の集計だけを返す。列は `event_id`, `genre`, `vendor_count`, `total_sales_yen`, `average_sales_yen` のみとし、`vendor_id`、屋号、個別売上、1 社の値を復元できる列を含めない。`HAVING count(distinct vendor_id) >= 3` を必須にする。

## 7. Supabase セキュリティ仕様

### 基本方針

1. `public` スキーマで API から触れ得る全テーブルは RLS を有効化する。テーブル作成後に RLS を忘れた状態を許容しない。
2. 認可判定は DB の RLS とサーバーの認可を両方通す。UI の非表示や URL リダイレクトは認可ではない。
3. Service Role は、Webhook 処理、認証後の claim、運営管理処理などの必要最小限のサーバー処理だけで使う。通常のユーザー API に Service Role を使って RLS を回避しない。
4. JWT の可変な `user_metadata` をロール・権限の根拠にしない。`profiles` と DB 側のヘルパー関数で確認する。
5. 更新可能にするテーブルには、更新ポリシーに対応する SELECT ポリシーも定義する。`USING` と `WITH CHECK` を適切に分ける。
6. ポリシーは対象ロールを明示し、`auth.uid()` を使う所有者判定を行う。安易な全件許可や、誰でも更新可能な `WITH CHECK (true)` を作らない。

### データ別のアクセス規則

| データ | 未ログイン | ベンダー本人 | イベント所有主催者 | 他ユーザー | 管理者 |
| --- | --- | --- | --- | --- | --- |
| 公開ベンダー情報 | `vendors_public` のみ閲覧可 | 自身を編集可 | 公開ビューのみ | 公開ビューのみ | 管理可 |
| ベンダー請求情報 | 不可 | 自身のみ | 不可 | 不可 | 必要時のみ |
| イベント | 公開済みのみ閲覧可 | 公開済みのみ閲覧可 | 自身を CRUD 可 | 公開済みのみ | 管理可 |
| 応募 | 不可 | 自身の応募のみ | 自身のイベントへの応募のみ | 不可 | 管理可 |
| 個別売上 | 不可 | 自身のみ | 不可 | 不可 | 必要時のみ |
| ジャンル集計 | 不可 | 将来必要なら自身の範囲だけ | 自身のイベントかつ 3 社以上のみ | 不可 | 管理可 |
| `pending_applications` | 作成のみ | 不可 | 不可 | 不可 | 運用処理のみ |

### 公開ビューの安全な作り方

PostgreSQL のビューは既定では所有者権限で動作し、RLS を意図せず回避し得る。したがって、公開ビューは次のどちらかを明示的に採用し、テストで検証する。

- Postgres 15 以降では `WITH (security_invoker = true)` を使用し、基礎テーブルの公開可能列・公開可能行に限ったポリシーと組み合わせる。
- それが使えない場合は、公開可能データを private data から物理的に分離した上で、列固定の `SECURITY DEFINER` 関数またはビューを慎重に作り、基礎テーブルへの不要な `SELECT` 権限を剥奪する。

FestMatch では前者を標準にする。`vendors` は公開プロフィール情報のみを持ち、`vendor_billing` と `sales_records` を物理分離することで、公開行ポリシーがあっても決済・売上情報を露出しない構成にする。`security_barrier` だけを「RLS 対策」とみなしてはならない。

集計ビューも同様に、主催者が自分の `event_id` だけを読める RLS/関数を設ける。ビューに `vendor_id` を含めず、3 社未満をフィルタすることを SQL とテストで担保する。

### Storage

- 公開ベンダー写真・公開イベント画像は用途別バケットに置き、許可された MIME type・サイズ・枚数をサーバーで検証する。
- 非公開書類を将来扱う場合は公開バケットと分離し、署名 URL を短期限で発行する。
- アップロードパスは `vendor/{vendor_id}/...`、`event/{event_id}/...` のように所有者と結び、Storage の RLS でも他者の書き換えを防ぐ。
- 画像 URL に秘密トークン、メールアドレス、Stripe ID を含めない。

## 8. 機能詳細

### 認証と初回登録

- Supabase Auth のメールマジックリンクを使う。
- 初回は「主催者」「ベンダー」を選び、サーバー側で `profiles` と対応するレコードを作る。管理者ロールの自己選択は不可とする。
- 認証コールバックでは `next` パラメータを許可リストで検証し、オープンリダイレクトを防ぐ。
- 既存セッション、期限切れリンク、別ロールへのアクセス拒否、ログアウトを実装する。

### 主催者のイベント管理

- 下書き作成、編集、公開、公開取り下げ、キャンセルを提供する。
- 日付、締切、定員、出店料、住所、座標、画像をサーバー側でも検証する。
- 地図は住所検索の補助に留め、保存する座標を主催者が確認できるようにする。
- 公開は、主催者の有効な年間契約または対象スポット利用が確認できる場合だけ許可する。
- 応募一覧では、応募ベンダーの公開プロフィールと応募文だけを表示し、他イベントでの個別売上・Stripe 情報は表示しない。
- 承認・却下は冪等に処理し、状態変更後に Resend で通知する。メール失敗が DB の状態更新を巻き戻さないよう outbox または再送可能な設計にする。

### ベンダーのプロフィールと応募

- プロフィールの屋号、ジャンル、紹介、活動地域、公開リンク、写真を編集できる。
- 公開可否をベンダー自身が選べる。非公開であっても応募は可能である。
- 募集中かつ締切前・未終了のイベントを、地域、日付、ジャンル、出店料で絞り込める。
- 同一イベントへの重複応募を防ぐ。すでに応募済みの場合は状態を示す。
- 応募の作成は Free を含む全プランで可能である。
- 承認済み応募についてのみ決済導線を表示する。金額はサーバーが生成した Checkout Session から取得する。

### 出店料決済と Stripe

1. ベンダーは Connect Express の Account Link でオンボーディングを完了する。
2. 主催者が応募を承認すると、ベンダーは決済開始できる。
3. サーバーはイベント出店料とベンダープランから応募手数料を計算し、Stripe Checkout Session を作る。
4. 決済は Connect destination charge を使い、出店料からプラットフォーム手数料を `application_fee_amount` として差し引き、残額を主催者側の Connect アカウントへ送る設計を基本とする。実際の資金フロー・責任主体は Stripe と法務上の要件を確認して確定する。
5. 画面遷移の成功 URL は支払い成功の証拠にしない。署名検証済み Webhook の `checkout.session.completed` と PaymentIntent の状態で `applications.status = paid` を更新する。
6. Webhook はイベント ID を保存し、同じ Stripe event を複数回処理しても安全な冪等実装にする。
7. ベンダーの Light / Standard / Pro 契約は Stripe Billing で管理し、`customer.subscription.*` Webhook から `vendor_billing` と `vendors.subscription_tier` を同期する。
8. 解約、支払い失敗、未完了の Connect onboarding では、表示と操作を安全に制限し、既存応募履歴は失わせない。

Stripe の秘密鍵でブラウザから Checkout Session や手数料を作成してはならない。テストモードの Webhook をローカル・ステージングで検証してから本番エンドポイントを登録する。

### FestMap

- `/festmap` に FestMatch 内イベントと外部イベントを地図・一覧で表示する。
- 絞り込みは都道府県、日付、ジャンル、イベント種別（FestMatch/外部）を提供する。
- 外部イベントは破線カードと「外部イベント」ラベルで明確に区別し、FestMatch 上で応募・決済できるように見せない。
- `/festmap/[prefecture]` は都道府県名、開催予定、関連ベンダーを安全な公開ビューで表示する。
- `/festmap/events/[slug]` は公開済みイベントだけを返す。終了後はアーカイブとして閲覧できるが応募 CTA は表示しない。
- `/festmap/vendors/[slug]` は `vendors_public` の許可列だけを使う。Stripe、メール、電話、売上、応募履歴は API レスポンスにも HTML にも含めない。
- 各公開ページに固有の `title`、`description`、OGP、canonical URL を設定する。`title` に雛形や未置換の `undefined` を残さない。
- 公開イベント詳細には Event JSON-LD を追加する。ただし外部イベントの不明な料金・出演者・販売状況を推測で入れない。
- sitemap と robots を生成し、非公開ページ、ダッシュボード、埋め込みの認証処理ページは検索対象から外す。

### 埋め込み応募

- 主催者はイベントごとに埋め込みコードを取得できる。
- `/embed/events/[slug]` は公開済み・応募可能なイベントだけを表示する。終了・締切後は募集終了表示だけを返す。
- 埋め込み許可元は、主催者が登録・検証した origin のリストからサーバー側で `Content-Security-Policy: frame-ancestors ...` を組み立てる。クエリ文字列や `Referer` の値をそのまま CSP に入れない。
- 未ログイン者の送信は `pending_applications` に最小情報だけを作成し、メール検証リンクへ進める。レコードの直接 SELECT は公開しない。
- claim リンクは期限・一回利用・ハッシュ化トークンを用いる。認証完了後、本人のベンダープロフィールと紐付けて `applications` を作成する。claim はサーバー専用処理で原子的に行う。
- 外部フォームにはレート制限、honeypot または CAPTCHA の導入余地、入力長制限、CSRF/Origin 対策を設ける。

### アーカイブと集計

- `ends_at < now()` のイベントは公開詳細と FestMap ではアーカイブ扱いにする。主催者は過去のイベントと応募履歴を閲覧できる。
- 終了・締切・キャンセルのイベントに新規応募や決済を作れない。
- 主催者ダッシュボードの完了数や承認数は、安全な集計で必要時に計算する。
- 売上集計を表示する場合は `organizer_event_genre_stats` の条件を満たすジャンルだけを返す。3 社未満では「データ不足」と表示し、ゼロ・個別値・推定可能な差分を表示しない。

## 9. API・サーバーアクションの規約

- 書き込みは Server Action または Route Handler に集約し、Zod 等で入力を検証する。
- クライアントから受け取る `organizer_id`、`vendor_id`、料金、プラン、ロール、Stripe ID を信用しない。ログインユーザーと DB レコードからサーバーで決定する。
- すべての外部入力を長さ・形式・URL スキーム・列挙値で検証する。住所、紹介文、応募文は表示時に HTML として実行しない。
- エラーはユーザー向けの安全な文言にし、Stripe/Supabase の生エラー、トークン、秘密情報、内部 ID を返さない。
- 変更系処理は失敗時の再試行を考慮し、Webhook・メール・claim・決済開始で冪等キーまたは一意制約を使う。
- 料金を扱う API には認証、所有者確認、状態遷移確認、Stripe の実状態確認をすべて入れる。

## 10. 推奨ディレクトリ構成

プロジェクトの既存規約を優先するが、新規構築では以下を目安にする。

```text
app/
  (public)/
    page.tsx
    pricing/page.tsx
    festmap/
      page.tsx
      [prefecture]/page.tsx
      events/[slug]/page.tsx
      vendors/[slug]/page.tsx
  (auth)/login/page.tsx
  organizer/
  vendor/
  admin/external-events/
  embed/events/[slug]/page.tsx
  apply/[slug]/page.tsx
  api/
    webhooks/stripe/route.ts
    stripe/connect/route.ts
    embed/pending-application/route.ts
components/
  festmap/
  organizer/
  vendor/
  ui/
lib/
  auth/
  supabase/
  stripe/
  validation/
  pricing.ts
  permissions.ts
supabase/
  migrations/
  seed.sql
tests/
  rls/
  unit/
  e2e/
```

Supabase のマイグレーションは CLI または接続済みの公式連携で生成・適用する。タイムスタンプ名を手書きで衝突させず、生成されたマイグレーションをレビューしてから適用する。

## 11. 実装フェーズ

### Phase 0 — 新規構築の準備と基盤確認

#### 実装内容

- 現在のリポジトリ、Node.js、package manager、既存の環境変数テンプレート、Supabase 設定、未コミット変更を読み取り専用で確認する。
- 新規実装の配置方針を決める。既存試作と競合する場合は削除せず隔離する。
- Next.js App Router、TypeScript、Tailwind、lint、テストランナーの最小構成を整える。
- `.env.local.example`、秘密情報の扱い、README の起動手順を用意する。
- Supabase ローカル環境または対象プロジェクトを接続し、初期マイグレーションを生成する。
- 対象 Supabase プロジェクトをリンクしてマイグレーションを適用する場合は、対象 Ref と適用先が開発環境であることを確認してから実行する。
- Stripe テストモード、Connect Express、3 つのベンダー契約 Price、Resend 送信ドメインを準備する。外部サービスの実設定が未提供なら、コードとテンプレートを整えた時点で停止し、必要値を一覧化してユーザーへ渡す。
- Phase 1 以降で使うデザイントークン、サーバー/ブラウザ用 Supabase クライアント、エラー表示の土台を作る。

#### 受け入れ基準

- 既存ユーザーコード・既存データを勝手に削除していない。
- 新規開発環境で `lint`、型検査、`build` が通る。
- `.env.local.example` に値は入っておらず、必要なキーと用途が説明されている。
- Service Role がクライアント側のコード・公開環境変数に存在しない。
- マイグレーション適用後、主催者ロールによる `sales_records` の SELECT が拒否され、`vendors_public` に Stripe・売上列がないことを実証できる。

### Phase 1 — 認証、ロール、プロフィール、RLS

#### 実装内容

- `profiles`、`organizers`、`vendors`、`vendor_billing` と必要な enum・トリガー・インデックスをマイグレーションで作る。
- RLS、所有者確認ヘルパー、`vendors_public` を実装する。
- マジックリンクログイン、初回ロール選択、ロール別ダッシュボード導線、ログアウトを実装する。
- ベンダー公開プロフィール編集と公開ページの最小版を実装する。
- Storage バケットと画像アップロードの所有者制御を実装する。

#### 受け入れ基準

- 未ログインでダッシュボードや請求情報を読めない。
- ベンダー A がベンダー B の非公開プロフィール・画像・請求情報を更新/閲覧できない。
- `vendors_public` のレスポンスにメール、電話、Stripe ID、売上、応募関連の列がない。
- 主催者ロールが自己登録で管理者になれない。
- `lint`、型検査、build、RLS テストが通る。

### Phase 2 — イベント、応募、通知

#### 実装内容

- `events`、`applications` を追加し、主催者のイベント CRUD と公開/下書きを実装する。
- 地図ピン、イベント検索・絞り込み、ベンダーの応募を実装する。
- 定員、締切、終了、重複応募、状態遷移を DB とサーバーで検証する。
- 主催者の承認・却下と Resend 通知を実装する。
- 主催者ダッシュボードで応募を安全に管理できるようにする。

#### 受け入れ基準

- Free ベンダーが公開・募集中のイベントに応募できる。
- 他主催者のイベントを編集できず、他ベンダーの応募を閲覧できない。
- 主催者は自分のイベントへの応募だけを閲覧できる。
- 締切・終了・キャンセル済みイベントへの応募が API 経由でも拒否される。
- 承認と却下のメールが正しい宛先・状態で送信され、メール失敗時の状態不整合がない。

### Phase 3 — Stripe Connect、応募決済、ベンダー契約

#### 実装内容

- ベンダー・主催者の Stripe 顧客/Connect 設定をサーバー側で実装する。
- Connect Express onboarding、承認済み応募の Checkout、手数料割引、Webhook、決済状態の冪等同期を実装する。
- Light / Standard / Pro の Stripe Billing Checkout と Customer Portal を実装する。
- 決済額の内訳をベンダーへ明示する。

#### 受け入れ基準

- Free/Light/Standard/Pro の各プランで応募作成可否は同じである。
- 料金計算はサーバー側だけで行われ、クライアントによる改ざんが決済額に反映されない。
- Stripe のテスト Webhook を重複送信しても、応募が二重に `paid` にならず二重メールも送られない。
- 成功 URL を直接開いただけでは支払い済みにならない。
- Connect 未完了時の決済導線が安全に失敗する。

### Phase 4 — FestMap、公開 SEO、外部イベント

#### 実装内容

- FestMap の全国・都道府県別・イベント詳細・公開ベンダー詳細を実装する。
- 地図と一覧の絞り込み、アーカイブ表示、公開メタデータ、OGP、JSON-LD、sitemap を実装する。
- `external_events` と管理画面を実装し、外部イベントを公式情報の手入力で管理できるようにする。
- 公開 API/ページが必ず `vendors_public` と安全なイベント投影を使うよう整理する。

#### 受け入れ基準

- 未ログインの FestMap 閲覧で非公開イベント、未公開ベンダー、Stripe・売上・連絡先が漏れない。
- 外部イベントが内部イベントと視覚的・機能的に区別され、外部リンクに必要な `rel` 属性がある。
- 各公開ページに固有の title、description、OGP、canonical があり、雛形タイトルが残らない。
- 検索エンジン向け JSON-LD が実際に表示している事実だけを含む。

### Phase 5 — 埋め込み応募、claim、アーカイブ、売上集計

#### 実装内容

- イベント別埋め込みコード、`frame-ancestors`、未認証応募、メール認証、claim を実装する。
- `pending_applications` の失効・トークンハッシュ・レート制限・原子的 claim を実装する。
- 終了イベントのアーカイブと、主催者向けの安全なジャンル集計を実装する。
- `sales_records` と `organizer_event_genre_stats` を実装する。

#### 受け入れ基準

- 許可されていない origin は iframe で表示できず、許可済み origin では表示できる。
- 未認証応募の中間レコードを一般ユーザーが一覧取得できない。
- claim リンクは期限切れ・再利用・別ユーザー利用を拒否する。
- 主催者アカウントから `sales_records` の SELECT が RLS で拒否される。
- 3 社未満のジャンルは集計 API/画面に現れず、3 社以上でも個社を特定できる列を返さない。
- 終了イベントでは新規応募と決済が拒否される一方、公開アーカイブは閲覧できる。

## 12. テストと検証

各 Phase 完了時に、影響範囲に応じて以下を実行する。環境変数や外部資格情報がなく実行できない検証は、未実行理由と代替の静的検証を明記し、「すべて成功」とは報告しない。

### 自動検証

- `npm run lint`
- `npx tsc --noEmit` またはプロジェクト定義の型検査
- `npm run build`
- 単体・統合テスト
- Supabase ローカル環境で anonymous、vendor A、vendor B、organizer A、organizer B、admin を使う RLS テスト
- Playwright によるログイン、イベント作成、Free ベンダー応募、承認、Stripe テスト決済、公開 FestMap、埋め込み応募の主要導線

### セキュリティ回帰テスト

少なくとも次を機械テストに含める。

1. 主催者が `sales_records` を SELECT できない。
2. 主催者が URL や API パラメータを偽装しても他主催者のイベント/応募を更新できない。
3. ベンダー A がベンダー B の `vendor_billing` や応募を読めない。
4. `vendors_public` と FestMap の JSON/HTML に決済 ID、メール、電話、個別売上が含まれない。
5. 集計が 3 社未満で返らず、ビューに `vendor_id` がない。
6. Free ベンダーの応募がサブスクリプションなしでも成功する。
7. Webhook の署名が不正な場合に状態更新しない。
8. CSP の `frame-ancestors` が任意入力により緩和されない。

### 文言・SEO 回帰チェック

- UI と公開文言に「主催者無料」「キッチンカーオーナー」がない。
- UI 本文に絵文字がない。
- すべての公開ルートに title、description、OGP がある。
- 外部リンクに `noopener` がある。
- 公開ページに開発用 URL、秘密値、未置換プレースホルダーがない。

## 13. 明示的なスコープ外

以下は今回の Phase 1〜5 には含めない。必要になった時点で別仕様・別 Phase とする。

- 請求書払い、銀行振込、会計ソフト連携
- 食品営業許可証・保険証などの書類提出、審査、保管
- 売上の POS 自動連携
- チャット、レビュー、評価、返金仲裁
- チケットサイト等の自動収集・スクレイピング
- 多通貨・海外税・多言語対応
- ネイティブモバイルアプリ

## 14. 完成の定義

FestMatch の初回リリースは、次の状態を満たしたときに完成とする。

1. 主催者が有効な料金状態でイベントを作成・公開し、応募を承認/却下できる。
2. Free を含む全ベンダーがプロフィールを作成し、イベントを探して応募できる。
3. 承認済みベンダーが Stripe Connect/Checkout を通じて安全に出店料を支払える。
4. 公開 FestMap からイベント・ベンダーを閲覧でき、公開情報以外は露出しない。
5. iframe 経由の応募が安全に本人のベンダーアカウントへ引き継がれる。
6. 主催者は個別売上を一切見られず、十分な母数があるジャンル集計だけを見られる。
7. lint、型検査、build、主要 E2E、RLS 回帰テストが通り、未検証の外部設定は明示されている。

## 15. Codex への開始プロンプト

このファイルをリポジトリ直下に置いたうえで、Codex には次のように指示する。

> `FESTMATCH_CODEX_SPEC.md` を唯一の仕様として、Phase 0 から順に実装してください。既存の未コミット変更やデータを削除しないでください。各 Phase の受け入れ基準を満たすまで次へ進まず、実行できた検証と未実行の外部設定を正確に報告してください。
