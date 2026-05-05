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
      <section className="rounded-[28px] border-2 border-black bg-white p-6 shadow-pop">
        <h2 className="font-heading text-2xl font-semibold text-sumi">まだ結果がありません</h2>
        <p className="mt-3 text-sm leading-7 text-black/70">
          ダーツを投げると、ここに今回の旅先が表示されます。
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-2xl border-2 border-black bg-shuiro px-5 py-3 text-sm font-bold text-white shadow-pop"
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
      <div className="rounded-[30px] border-2 border-black bg-black p-6 text-white shadow-pop">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/60">Hit!</p>
        <h2 className="mt-3 font-heading text-4xl font-semibold leading-tight">
          {destination.prefecture}
        </h2>
        <p className="mt-2 text-base text-white/80">{destination.region}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-[24px] border-2 border-black bg-white p-4 shadow-pop-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">
            おすすめシーズン
          </p>
          <p className="mt-3 text-sm font-semibold leading-6">{destination.season}</p>
        </div>
        <div className="rounded-[24px] border-2 border-black bg-white p-4 shadow-pop-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">
            目安予算
          </p>
          <p className="mt-3 text-sm font-semibold leading-6">{destination.budget}</p>
        </div>
      </div>

      <div className="rounded-[24px] border-2 border-black bg-mizu p-5 text-white shadow-pop">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
          ここが魅力！
        </p>
        <p className="mt-3 text-sm leading-7 text-white/95">{destination.highlight}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a
          href={planUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl border-2 border-black bg-shuiro px-4 py-4 text-center text-sm font-bold text-white shadow-pop"
        >
          🗺 プランを作る
        </a>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-2xl border-2 border-black bg-white px-4 py-4 text-sm font-bold text-black shadow-pop"
        >
          ↺ 再挑戦
        </button>
      </div>

      <button
        type="button"
        onClick={onShare}
        className="w-full rounded-2xl border-2 border-black bg-white px-4 py-4 text-sm font-bold text-black shadow-pop"
      >
        📤 みんなに共有する
        <span className="ml-2 text-xs font-medium text-black/50">{shareLabel}</span>
      </button>
    </section>
  );
}
