import type { ReactNode } from "react";

import {
  AREA_OPTIONS,
  BUDGET_OPTIONS,
  DART_STYLES,
  DURATION_OPTIONS,
  STYLE_OPTIONS,
  type AreaTag,
  type DartStyleId,
  type TravelBudgetTag,
  type TravelDurationTag,
  type TravelStyleTag,
} from "@/lib/destinations";

type FilterState = {
  areas: AreaTag[];
  budgets: TravelBudgetTag[];
  durations: TravelDurationTag[];
  styles: TravelStyleTag[];
};

type SettingsPanelProps = {
  filters: FilterState;
  selectedStyleId: DartStyleId;
  onSelectStyle: (styleId: DartStyleId) => void;
  onToggleArea: (area: AreaTag) => void;
  onToggleBudget: (budget: TravelBudgetTag) => void;
  onToggleDuration: (duration: TravelDurationTag) => void;
  onToggleStyle: (style: TravelStyleTag) => void;
  matchCount: number;
};

type ChipProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function FilterChip({ active, label, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "border-brand/20 bg-brand text-white shadow-soft"
          : "border-black/[0.06] bg-[#f7f9fc] text-black/68 hover:border-black/[0.1] hover:bg-white"
      }`}
    >
      {label}
    </button>
  );
}

function SectionTitle({ title, caption }: { title: string; caption?: string }) {
  return (
    <div className="space-y-1">
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-sumi">{title}</h3>
      {caption ? <p className="text-sm leading-6 text-black/52">{caption}</p> : null}
    </div>
  );
}

function SectionShell({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-black/[0.06] bg-white/88 p-5 shadow-soft">
      <SectionTitle title={title} caption={caption} />
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SettingsPanel({
  filters,
  selectedStyleId,
  onSelectStyle,
  onToggleArea,
  onToggleBudget,
  onToggleDuration,
  onToggleStyle,
  matchCount,
}: SettingsPanelProps) {
  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-[30px] border border-black/[0.06] bg-white/92 px-6 py-6 shadow-elevated">
        <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-brand/10 blur-3xl" />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.22em] text-black/40">
          Available Destinations
        </p>
        <div className="relative mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="font-heading text-3xl font-semibold tracking-tight text-sumi">
              {matchCount}
            </p>
            <p className="mt-2 text-sm leading-6 text-black/58">現在の条件に合う旅先</p>
          </div>
          <p className="rounded-full bg-black/[0.04] px-3 py-1 text-xs font-medium text-black/55">
            47都道府県を収録
          </p>
        </div>
      </div>

      <SectionShell title="的のスタイル" caption="ダーツの見た目だけを切り替えます。">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {DART_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelectStyle(style.id)}
              className={`rounded-[24px] border px-4 py-4 text-left transition ${
                selectedStyleId === style.id
                  ? "border-brand/20 bg-brand/5 text-sumi shadow-soft"
                  : "border-black/[0.06] bg-[#f8fafc] text-black/80 hover:border-black/[0.1] hover:bg-white"
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[1.5rem] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05)]">
                {style.emoji}
              </div>
              <p className="mt-3 text-sm font-medium text-black/82">{style.label}</p>
            </button>
          ))}
        </div>
      </SectionShell>

      <SectionShell title="エリア" caption="全国を選ぶと、地域の絞り込みを外せます。">
        <div className="flex flex-wrap gap-3">
          {AREA_OPTIONS.map((area) => (
            <FilterChip
              key={area}
              active={filters.areas.includes(area)}
              label={area}
              onClick={() => onToggleArea(area)}
            />
          ))}
        </div>
      </SectionShell>

      <SectionShell title="予算">
        <div className="flex flex-wrap gap-3">
          {BUDGET_OPTIONS.map((budget) => (
            <FilterChip
              key={budget}
              active={filters.budgets.includes(budget)}
              label={budget}
              onClick={() => onToggleBudget(budget)}
            />
          ))}
        </div>
      </SectionShell>

      <SectionShell title="期間">
        <div className="flex flex-wrap gap-3">
          {DURATION_OPTIONS.map((duration) => (
            <FilterChip
              key={duration}
              active={filters.durations.includes(duration)}
              label={duration}
              onClick={() => onToggleDuration(duration)}
            />
          ))}
        </div>
      </SectionShell>

      <SectionShell title="旅のスタイル">
        <div className="flex flex-wrap gap-3">
          {STYLE_OPTIONS.map((style) => (
            <FilterChip
              key={style}
              active={filters.styles.includes(style)}
              label={style}
              onClick={() => onToggleStyle(style)}
            />
          ))}
        </div>
      </SectionShell>
    </section>
  );
}
