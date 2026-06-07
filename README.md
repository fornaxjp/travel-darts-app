# 旅●ダーツ

Next.js 14 + TypeScript + Tailwind CSS で作った、ダーツで日本の旅先を決める Web アプリです。

## Local Setup

```bash
npm install
npm run dev
```

`http://localhost:3000` で開きます。

## Environment Variables

このプロジェクトはクライアント側で Supabase Realtime を使うため、以下を設定します。

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

互換用に `NEXT_PUBLIC_SUPABASE_ANON_KEY` も読み取れますが、基本は `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` を使ってください。

## Travel Provider Setup

旅プラン提案は、キーがあるサービスだけ実データに切り替わります。キーがない場合も、天気とフォールバック提案でアプリは動きます。

```bash
RAKUTEN_APPLICATION_ID=
RAKUTEN_ACCESS_KEY=
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=
GOOGLE_PLACES_API_KEY=
```

### Rakuten Travel

1. 楽天ウェブサービスでアプリを作成する
2. `applicationId` と `accessKey` を取得する
3. Vercel の Environment Variables に `RAKUTEN_APPLICATION_ID` と `RAKUTEN_ACCESS_KEY` を登録する

このアプリでは楽天トラベルキーワード検索APIを使い、当選した都道府県と主要都市名からホテル候補を出します。

### Amadeus

1. Amadeus for Developers でアプリを作成する
2. Self-Service API の `API Key` と `API Secret` を取得する
3. Vercel に `AMADEUS_CLIENT_ID` と `AMADEUS_CLIENT_SECRET` を登録する
4. テスト環境はデフォルトで `https://test.api.amadeus.com` を使う
5. 本番キーへ切り替える場合だけ `AMADEUS_BASE_URL=https://api.amadeus.com` を登録する

このアプリでは OAuth2 の client credentials でトークンを取得し、Flight Offers Search で往復航空券の候補を出します。

### Google Places

1. Google Cloud Console で Places API (New) を有効化する
2. API key を作成し、必要に応じて HTTP referrer / API restrictions を設定する
3. Vercel に `GOOGLE_PLACES_API_KEY` を登録する

食べログ点数を直接取得できる公式公開APIは確認できないため、このアプリでは Google Places Text Search の `minRating: 3.5` を使い、地元料理キーワードに合うレストラン候補を出します。

## Deploy To Vercel

1. Vercel にこの GitHub リポジトリを import する
2. Environment Variables に以下を登録する
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `RAKUTEN_APPLICATION_ID`
   - `RAKUTEN_ACCESS_KEY`
   - `AMADEUS_CLIENT_ID`
   - `AMADEUS_CLIENT_SECRET`
   - `GOOGLE_PLACES_API_KEY`
3. Production Deploy を実行する

CLI を使う場合:

```bash
npx vercel
npx vercel --prod
```
