# FestMatch

イベント主催者とベンダーを直接つなぐ、主催者自走型の出店管理 SaaS です。

## 開発を始める

1. `.env.local.example` を `.env.local` にコピーし、Supabase・Stripe・Resend の値を設定します。新規 Supabase プロジェクトでは `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` を優先し、既存の anon key は移行期間だけ使います。
2. 既存のリモート Supabase を使う場合、リモートを正として先にローカル履歴を同期します。`SUPABASE_ACCESS_TOKEN` とリモート DB パスワードを設定してから、次を実行してください。ローカルの未同期マイグレーションをそのまま `db push` してはいけません。

   ```bash
   npx supabase@latest link --project-ref jktjmdnfmxfradmzzqzy
   npx supabase@latest db pull remote_schema
   ```

3. `vendor-photos` と `event-images` を使用します。旧 `kitchen-car-photos` は新規コードから参照しません。
4. iframe 応募フォームを使う場合は、許可する Origin を `FESTMATCH_EMBED_ALLOWED_ORIGINS=https://example.jp,https://www.example.jp` のように設定します。未設定では CSP により埋め込みを拒否します。
5. `npm run dev` を実行します。

## 主要ルート

- `/organizer`: 主催者用のイベント・応募・決済管理
- `/vendor`: ベンダー用の検索・応募・売上管理
- `/festmap`: 一般公開のイベントディレクトリ
- `/embed/events/[slug]`: 登録ドメインだけで表示できる応募ウィジェット

公開ベンダープロフィールは `vendors_public` VIEW、主催者向け統計は `sales_aggregate_by_genre` VIEW のみを使用します。個社売上、応募、Stripe 関連データを公開ページで取得しません。

## 検証

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build

# 実リモートの RLS・公開 VIEW・Storage を検証（一時テストユーザーは自動削除）
RUN_REMOTE_SUPABASE_TESTS=1 node --env-file=.env.local --test tests/remote-supabase.integration.test.mjs
```

本番用の Stripe Webhook は `/api/webhooks/stripe` を登録します。旧 `/api/stripe/webhook` は互換エンドポイントとして残しています。

有料の出店料を Stripe Connect destination charge で決済するには、主催者の Connect 受取先を保存するリモート DB マイグレーションが必要です。現在のリモート 9 テーブル構成では資金の誤送金を避けるため、無料イベント以外の出店料決済を明示的に停止しています。ベンダーの Stripe Billing と主催者の年間契約は既存の請求列を使用します。
