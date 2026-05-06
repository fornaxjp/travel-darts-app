import { Suspense } from "react";

import { TravelDartsApp } from "@/components/TravelDartsApp";

function PageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="paper-panel w-full max-w-[620px] rounded-[28px] border border-black/10 p-7 shadow-elevated">
        <p className="font-heading text-3xl font-semibold text-sumi">旅●ダーツ</p>
        <p className="mt-3 text-sm text-black/70">旅先の準備をしています…</p>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <TravelDartsApp />
    </Suspense>
  );
}
