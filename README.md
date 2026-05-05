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

## Deploy To Vercel

1. Vercel にこの GitHub リポジトリを import する
2. Environment Variables に以下を登録する
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Production Deploy を実行する

CLI を使う場合:

```bash
npx vercel
npx vercel --prod
```
