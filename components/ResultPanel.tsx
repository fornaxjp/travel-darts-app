import type { Destination } from "@/lib/destinations";

type ResultPanelProps = {
  destination: Destination | null;
  budgetTitle: string;
  budgetLabel: string;
  budgetCaption: string;
  onRetry: () => void;
  onShare: () => void;
  shareLabel: string;
};

export function ResultPanel({
  destination,
  budgetTitle,
  budgetLabel,
  budgetCaption,
  onRetry,
  onShare,
  shareLabel,
}: ResultPanelProps) {
  if (!destination) {
    return (
      <section className="rounded-[30px] border border-black/[0.06] bg-white/92 p-7 shadow-elevated">
        <h2 className="font-heading text-2xl font-semibold text-sumi">まだ結果がありません</h2>
        <p className="mt-3 text-sm leading-7 text-black/62">
          ダーツを投げると、ここに今回の旅先が表示されます。
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-2xl bg-brand px-5 py-3 text-sm font-medium text-white shadow-soft transition hover:-translate-y-0.5"
        >
          ダーツを投げる
        </button>
      </section>
    );
  }

  const planUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${destination.prefecture} 旅行プラン おすすめ`,
  )}`;

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-[32px] border border-black/[0.06] bg-white/92 p-7 shadow-elevated">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-brand/12 blur-3xl" />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.24em] text-black/40">
          Selected Destination
        </p>
        <h2 className="relative mt-3 font-heading text-[2.8rem] font-semibold leading-tight tracking-tight text-sumi">
          {destination.prefecture}
        </h2>
        <p className="relative mt-2 text-sm text-black/58">{destination.region}</p>
        <div className="relative mt-5 inline-flex rounded-full bg-black/[0.04] px-3 py-1 text-xs font-medium text-black/60">
          旅先が決まりました
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[26px] border border-black/[0.06] bg-[#fbfcff] p-5 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
            おすすめシーズン
          </p>
          <p className="mt-3 text-sm leading-7 text-black/78">{destination.season}</p>
        </div>
        <div className="rounded-[26px] border border-black/[0.06] bg-[#fbfcff] p-5 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
            {budgetTitle}
          </p>
          <p className="mt-3 text-sm leading-7 text-black/78">{budgetLabel}</p>
          <p className="mt-2 text-xs leading-6 text-black/50">{budgetCaption}</p>
        </div>
      </div>

      <div className="rounded-[26px] border border-black/[0.06] bg-white/90 p-5 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
          ここが魅力！
        </p>
        <p className="mt-3 text-sm leading-7 text-black/76">{destination.highlight}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={planUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl bg-brand px-4 py-4 text-center text-sm font-medium text-white shadow-soft transition hover:-translate-y-0.5"
        >
          プランを作る
        </a>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-2xl border border-black/[0.06] bg-white/88 px-4 py-4 text-sm font-medium text-black/80 shadow-soft transition hover:-translate-y-0.5"
        >
          もう一度試す
        </button>
      </div>

      <button
        type="button"
        onClick={onShare}
        className="w-full rounded-2xl border border-black/[0.06] bg-white/88 px-4 py-4 text-sm font-medium text-black/80 shadow-soft transition hover:-translate-y-0.5"
      >
        結果を共有する
        <span className="ml-2 text-xs font-medium text-black/48">{shareLabel}</span>
      </button>
    </section>
  );
}
