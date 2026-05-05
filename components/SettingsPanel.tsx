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
      className={`rounded-full border-2 border-black px-4 py-2 text-sm font-semibold shadow-pop-sm transition ${
        active
          ? accent
            ? "bg-mizu text-white"
            : "bg-shuiro text-white"
          : "bg-white text-black"
      }`}
    >
      {label}
    </button>
  );
}

function SectionTitle({ title, caption }: { title: string; caption?: string }) {
  return (
    <div className="space-y-1">
      <h3 className="font-heading text-xl font-semibold text-sumi">{title}</h3>
      {caption ? <p className="text-xs text-black/60">{caption}</p> : null}
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
    <section className="space-y-7">
      <div className="rounded-[24px] border-2 border-black bg-white px-4 py-4 shadow-pop">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/50">
          Match Count
        </p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <p className="font-heading text-3xl font-semibold text-sumi">{matchCount}</p>
            <p className="text-sm text-black/70">現在の条件でヒットする行き先</p>
          </div>
          <p className="rounded-full border-2 border-black bg-washi px-3 py-1 text-xs font-bold">
            47都道府県を収録
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle title="的のスタイル選択" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {DART_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelectStyle(style.id)}
              className={`rounded-2xl border-2 border-black px-4 py-4 text-left shadow-pop-sm transition ${
                selectedStyleId === style.id
                  ? "bg-shuiro text-white"
                  : "bg-white text-black"
              }`}
            >
              <div className="text-2xl">{style.emoji}</div>
              <p className="mt-2 text-sm font-bold">{style.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle title="エリアフィルター" caption="全国は全解除の代わりにも使えます" />
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
