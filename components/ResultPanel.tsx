import type { Destination } from "@/lib/destinations";

type ResultPanelProps = {
  destination: Destination | null;
  onRetry: () => void;
  onShare: () => void;
  shareLabel: string;
};

export function ResultPanel({
  destination,
  onRetry,
  onShare,
  shareLabel,
}: ResultPanelProps) {
  if (!destination) {
    return (
      <section className="rounded-[28px] border border-black/10 bg-white/80 p-7 shadow-elevated">
        <h2 className="font-heading text-2xl font-semibold text-sumi">まだ結果がありません</h2>
        <p className="mt-3 text-sm leading-7 text-black/70">
          ダーツを投げると、ここに今回の旅先が表示されます。
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-2xl bg-shuiro px-5 py-3 text-sm font-medium text-white shadow-soft transition hover:-translate-y-0.5"
        >
          🎯 ダーツを投げる
        </button>
      </section>
    );
  }

  const planUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${destination.prefecture} 旅行プラン おすすめ`,
  )}`;

  return (
    <section className="space-y-4">
      <div className="rounded-[30px] bg-[#1f1b19] p-7 text-[#f8f0e4] shadow-elevated">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50">
          Destination
        </p>
        <h2 className="mt-3 font-heading text-[2.6rem] font-semibold leading-tight tracking-tight">
          {destination.prefecture}
        </h2>
        <p className="mt-2 text-sm text-white/70">{destination.region}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[24px] border border-black/10 bg-white/80 p-5 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
            おすすめシーズン
          </p>
          <p className="mt-3 text-sm leading-7 text-black/80">{destination.season}</p>
        </div>
        <div className="rounded-[24px] border border-black/10 bg-white/80 p-5 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
            目安予算
          </p>
          <p className="mt-3 text-sm leading-7 text-black/80">{destination.budget}</p>
        </div>
      </div>

      <div className="rounded-[24px] border border-black/10 bg-[#f8f1e6] p-5 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
          ここが魅力！
        </p>
        <p className="mt-3 text-sm leading-7 text-black/80">{destination.highlight}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={planUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl bg-shuiro px-4 py-4 text-center text-sm font-medium text-white shadow-soft transition hover:-translate-y-0.5"
        >
          🗺 プランを作る
        </a>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-2xl border border-black/10 bg-white/80 px-4 py-4 text-sm font-medium text-black/80 shadow-soft transition hover:-translate-y-0.5"
        >
          ↺ 再挑戦
        </button>
      </div>

      <button
        type="button"
        onClick={onShare}
        className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-4 text-sm font-medium text-black/80 shadow-soft transition hover:-translate-y-0.5"
      >
        📤 みんなに共有する
        <span className="ml-2 text-xs font-medium text-black/50">{shareLabel}</span>
      </button>
    </section>
  );
}
