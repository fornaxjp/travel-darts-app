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
  accent?: boolean;
};

function FilterChip({ active, label, onClick, accent = false }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2.5 text-sm font-medium shadow-soft transition ${
        active
          ? accent
            ? "border-shuiro/20 bg-shuiro/10 text-shuiro"
            : "border-sumi bg-sumi text-white"
          : "border-black/10 bg-white/80 text-black/70 hover:bg-white"
      }`}
    >
      {label}
    </button>
  );
}

function SectionTitle({ title, caption }: { title: string; caption?: string }) {
  return (
    <div className="space-y-1">
      <h3 className="font-heading text-[1.15rem] font-semibold text-sumi">{title}</h3>
      {caption ? <p className="text-sm leading-6 text-black/60">{caption}</p> : null}
    </div>
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
      <div className="rounded-[26px] border border-black/10 bg-white/75 px-5 py-5 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/40">
          Match Count
        </p>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <p className="font-heading text-3xl font-semibold tracking-tight text-sumi">
              {matchCount}
            </p>
            <p className="mt-1 text-sm text-black/60">現在の条件で候補に残る行き先</p>
          </div>
          <p className="rounded-full bg-black/[0.05] px-3 py-1 text-xs font-medium text-black/60">
            47都道府県を収録
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle title="的のスタイル" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {DART_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelectStyle(style.id)}
              className={`rounded-[22px] border px-4 py-4 text-left shadow-soft transition ${
                selectedStyleId === style.id
                  ? "border-shuiro/20 bg-[#fbf1ee] text-sumi"
                  : "border-black/10 bg-white/80 text-black/80 hover:bg-white"
              }`}
            >
              <div className="text-[1.75rem]">{style.emoji}</div>
              <p className="mt-3 text-sm font-medium">{style.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle title="エリア" caption="全国を選ぶと、地域の絞り込みを外せます。" />
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
      </div>

      <div className="space-y-3">
        <SectionTitle title="予算" />
        <div className="flex flex-wrap gap-3">
          {BUDGET_OPTIONS.map((budget) => (
            <FilterChip
              key={budget}
              active={filters.budgets.includes(budget)}
              label={budget}
              onClick={() => onToggleBudget(budget)}
              accent
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle title="期間" />
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
      </div>

      <div className="space-y-3">
        <SectionTitle title="旅のスタイル" />
        <div className="flex flex-wrap gap-3">
          {STYLE_OPTIONS.map((style) => (
            <FilterChip
              key={style}
              active={filters.styles.includes(style)}
              label={style}
              onClick={() => onToggleStyle(style)}
              accent
            />
          ))}
        </div>
      </div>
    </section>
  );
}
