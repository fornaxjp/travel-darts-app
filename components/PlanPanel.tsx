"use client";

import { useEffect, useMemo, useState } from "react";

import type { Destination } from "@/lib/destinations";
import type { ProviderStatus, TravelPlanResponse } from "@/lib/travel-plan";

type PlanPanelProps = {
  destination: Destination | null;
  originPrefecture: string;
  departureDate: string;
  nights: number;
  adults: number;
};

const STATUS_STYLES: Record<ProviderStatus["state"], string> = {
  live: "border-[#b8d7ff] bg-[#eef6ff] text-[#1661b7]",
  fallback: "border-[#d7dee7] bg-[#f5f8fb] text-black/62",
  unavailable: "border-[#ece2cf] bg-[#fcf8ef] text-[#8d6a1e]",
  error: "border-[#f0c7c3] bg-[#fff2f1] text-[#b24b42]",
};

function PanelTitle({
  eyebrow,
  title,
  caption,
}: {
  eyebrow: string;
  title: string;
  caption: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/38">
        {eyebrow}
      </p>
      <h3 className="text-xl font-semibold tracking-[-0.02em] text-sumi">{title}</h3>
      <p className="text-sm leading-7 text-black/58">{caption}</p>
    </div>
  );
}

function StatusPill({ status }: { status: ProviderStatus }) {
  return (
    <div
      className={`rounded-full border px-3 py-1 text-[11px] font-medium ${STATUS_STYLES[status.state]}`}
      title={`${status.label}: ${status.message}`}
    >
      {status.label}
      <span className="ml-1 text-[10px] opacity-75">{status.source}</span>
    </div>
  );
}

export function PlanPanel({
  destination,
  originPrefecture,
  departureDate,
  nights,
  adults,
}: PlanPanelProps) {
  const [plan, setPlan] = useState<TravelPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestKey = useMemo(
    () =>
      JSON.stringify({
        destinationPrefecture: destination?.prefecture ?? "",
        originPrefecture,
        departureDate,
        nights,
        adults,
      }),
    [adults, departureDate, destination?.prefecture, nights, originPrefecture],
  );

  useEffect(() => {
    if (!destination) {
      setPlan(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadPlan() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/plan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: requestKey,
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || "plan_fetch_failed");
        }

        const data = (await response.json()) as TravelPlanResponse;
        setPlan(data);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "plan_fetch_failed");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadPlan();

    return () => controller.abort();
  }, [destination, requestKey]);

  if (!destination) {
    return null;
  }

  return (
    <section
      id="travel-plan"
      className="space-y-5 rounded-[32px] border border-black/[0.06] bg-white/92 p-6 shadow-elevated sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PanelTitle
          eyebrow="Travel Planner"
          title="現実プランのたたき台"
          caption="出発日・人数・現在地から、行き方と宿をまとめて提案します。"
        />
        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-black/[0.06] bg-[#f7f9fc] px-3 py-1 text-xs font-medium text-black/62">
            {departureDate}
          </div>
          <div className="rounded-full border border-black/[0.06] bg-[#f7f9fc] px-3 py-1 text-xs font-medium text-black/62">
            {nights}泊
          </div>
          <div className="rounded-full border border-black/[0.06] bg-[#f7f9fc] px-3 py-1 text-xs font-medium text-black/62">
            {adults}名
          </div>
        </div>
      </div>

      {isLoading && !plan ? (
        <div className="rounded-[24px] border border-black/[0.06] bg-[#f9fbff] p-5 text-sm leading-7 text-black/58 shadow-soft">
          {destination.prefecture} の旅プランを組み立てています。天気、宿、飛行機の順に確認中です。
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[24px] border border-[#f0c7c3] bg-[#fff4f2] p-5 text-sm leading-7 text-[#9d4b44] shadow-soft">
          プラン提案の読み込みで迷子になりました。少し時間を置いて再表示すると回復することがあります。
        </div>
      ) : null}

      {plan ? (
        <>
          <div className="rounded-[28px] border border-black/[0.06] bg-[#fbfcff] p-5 shadow-soft">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/40">
              Summary
            </p>
            <h4 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-sumi">
              {plan.summary.headline}
            </h4>
            <p className="mt-2 text-sm leading-7 text-black/62">{plan.summary.detail}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-black/[0.06] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
                  ざっくり予算
                </p>
                <p className="mt-2 text-sm font-medium text-black/80">{plan.summary.budgetLabel}</p>
                <p className="mt-2 text-xs leading-6 text-black/50">{plan.summary.budgetCaption}</p>
              </div>
              <div className="rounded-[22px] border border-black/[0.06] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
                  時期のヒント
                </p>
                <p className="mt-2 text-sm font-medium text-black/80">
                  {plan.weather.dateLabel} / {plan.weather.title}
                </p>
                <p className="mt-2 text-xs leading-6 text-black/50">{plan.weather.detail}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {plan.providerStatuses.map((status) => (
              <StatusPill key={status.id} status={status} />
            ))}
          </div>

          <div className="rounded-[26px] border border-black/[0.06] bg-white/88 p-5 shadow-soft">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
              天気とシーズン
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-black/80">{plan.weather.title}</p>
              {plan.weather.temperatureLabel ? (
                <span className="rounded-full bg-[#f3f7ff] px-3 py-1 text-xs font-medium text-[#205ea6]">
                  {plan.weather.temperatureLabel}
                </span>
              ) : null}
              {plan.weather.precipitationLabel ? (
                <span className="rounded-full bg-[#f3f7ff] px-3 py-1 text-xs font-medium text-[#205ea6]">
                  {plan.weather.precipitationLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-7 text-black/62">{plan.weather.detail}</p>
            <p className="mt-2 text-xs text-black/40">source: {plan.weather.source}</p>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
              行き方の候補
            </p>
            <div className="grid gap-3">
              {plan.transportOptions.map((option) => (
                <a
                  key={`${option.mode}-${option.title}`}
                  href={option.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[24px] border border-black/[0.06] bg-[#fbfcff] p-5 shadow-soft transition hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-sumi">{option.title}</p>
                      <p className="mt-2 text-sm leading-7 text-black/62">{option.detail}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-black/55">
                      {option.source}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-black/[0.06] bg-white px-3 py-1 text-xs font-medium text-black/62">
                      {option.durationLabel}
                    </span>
                    <span className="rounded-full border border-black/[0.06] bg-white px-3 py-1 text-xs font-medium text-black/62">
                      {option.priceLabel}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {plan.flightOptions.length > 0 ? (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
                飛行機の候補
              </p>
              <div className="grid gap-3">
                {plan.flightOptions.map((option) => (
                  <a
                    key={`${option.title}-${option.priceLabel}`}
                    href={option.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-soft transition hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-sumi">{option.title}</p>
                        <p className="mt-2 text-sm leading-7 text-black/62">{option.detail}</p>
                      </div>
                      <span className="rounded-full bg-[#eef6ff] px-3 py-1 text-[11px] font-medium text-[#1661b7]">
                        {option.source}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-black/[0.06] bg-[#f8fafc] px-3 py-1 text-xs font-medium text-black/62">
                        {option.durationLabel}
                      </span>
                      <span className="rounded-full border border-black/[0.06] bg-[#f8fafc] px-3 py-1 text-xs font-medium text-black/62">
                        {option.priceLabel}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
              泊まり先の候補
            </p>
            <div className="grid gap-3">
              {plan.hotelOptions.map((hotel) => (
                <a
                  key={`${hotel.name}-${hotel.area}`}
                  href={hotel.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-soft transition hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-sumi">{hotel.name}</p>
                      <p className="mt-2 text-sm leading-7 text-black/62">{hotel.detail}</p>
                    </div>
                    <span className="rounded-full bg-[#f7f9fc] px-3 py-1 text-[11px] font-medium text-black/55">
                      {hotel.source}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-black/[0.06] bg-[#f8fafc] px-3 py-1 text-xs font-medium text-black/62">
                      {hotel.area}
                    </span>
                    <span className="rounded-full border border-black/[0.06] bg-[#f8fafc] px-3 py-1 text-xs font-medium text-black/62">
                      {hotel.priceLabel}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {plan.notes.length > 0 ? (
            <div className="rounded-[24px] border border-black/[0.06] bg-[#f8fafc] p-5 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
                Notes
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-black/58">
                {plan.notes.map((note) => (
                  <li key={note}>• {note}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
