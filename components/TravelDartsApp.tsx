"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DartMap } from "@/components/DartMap";
import { LiveBadge } from "@/components/LiveBadge";
import { ResultPanel } from "@/components/ResultPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import {
  DART_STYLES,
  destinations,
  findDestinationByPrefecture,
  formatBudgetCaption,
  formatBudgetLabel,
  getDestinationBudgetTags,
  type AreaTag,
  type DartStyleId,
  type Destination,
  type TravelBudgetTag,
  type TravelDurationTag,
  type TravelStyleTag,
} from "@/lib/destinations";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";

type TabId = "settings" | "darts" | "result";
type TravelMode = "solo" | "group";

type FilterState = {
  areas: AreaTag[];
  budgets: TravelBudgetTag[];
  durations: TravelDurationTag[];
  styles: TravelStyleTag[];
};

type ThrowAnimation = {
  token: string;
  destination: Destination;
  dartStyleId: DartStyleId;
  thrownBy?: string;
};

type RealtimePayload = {
  token: string;
  prefecture: string;
  dartStyleId: DartStyleId;
  thrownBy: string;
};

const DEFAULT_FILTERS: FilterState = {
  areas: ["全国"],
  budgets: [],
  durations: [],
  styles: [],
};

function makeShortId() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function makeParticipantName() {
  return `旅人-${makeShortId()}`;
}

function getRandomDestination(items: Destination[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function toggleMulti<T extends string>(current: T[], value: T) {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

function matchesAny<T extends string>(selected: T[], target: T[]) {
  if (selected.length === 0) {
    return true;
  }

  return selected.some((item) => target.includes(item));
}

function isAreaMatch(selectedAreas: AreaTag[], destination: Destination) {
  if (selectedAreas.length === 0 || selectedAreas.includes("全国")) {
    return true;
  }

  return selectedAreas.some((area) => destination.areas.includes(area));
}

export function TravelDartsApp() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const roomFromUrl = searchParams.get("room")?.trim().toUpperCase() ?? "";

  const [activeTab, setActiveTab] = useState<TabId>("darts");
  const [mode, setMode] = useState<TravelMode>(roomFromUrl ? "group" : "solo");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedStyleId, setSelectedStyleId] = useState<DartStyleId>("pin");
  const [lastThrowStyleId, setLastThrowStyleId] = useState<DartStyleId>("pin");
  const [originPrefecture, setOriginPrefecture] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [currentThrow, setCurrentThrow] = useState<ThrowAnimation | null>(null);
  const [roomId, setRoomId] = useState(roomFromUrl);
  const [participantName, setParticipantName] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [statusLabel, setStatusLabel] = useState("ひとり旅モード");
  const [shareLabel, setShareLabel] = useState("URL をコピーして招待できます");
  const [resultShareLabel, setResultShareLabel] = useState("URLコピー");

  const channelRef = useRef<RealtimeChannel | null>(null);
  const resultTimerRef = useRef<number | null>(null);

  const visibleDestinations = useMemo(
    () =>
      destinations.filter((destination) => {
        const areaMatch = isAreaMatch(filters.areas, destination);
        const budgetMatch = matchesAny(
          filters.budgets,
          getDestinationBudgetTags(destination, originPrefecture),
        );
        const durationMatch = matchesAny(filters.durations, destination.durationTags);
        const styleMatch = matchesAny(filters.styles, destination.styleTags);

        return areaMatch && budgetMatch && durationMatch && styleMatch;
      }),
    [filters, originPrefecture],
  );

  const syncRoomInUrl = useCallback(
    (nextRoomId: string | null) => {
      if (typeof window === "undefined") {
        return;
      }

      const url = new URL(window.location.href);
      if (nextRoomId) {
        url.searchParams.set("room", nextRoomId);
      } else {
        url.searchParams.delete("room");
      }

      const search = url.searchParams.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const beginThrow = useCallback(
    (destination: Destination, dartStyleId: DartStyleId, token: string, thrownBy?: string) => {
      setSelectedDestination(destination);
      setCurrentThrow({ token, destination, dartStyleId, thrownBy });
      setLastThrowStyleId(dartStyleId);
      setActiveTab("darts");

      if (resultTimerRef.current) {
        window.clearTimeout(resultTimerRef.current);
      }

      resultTimerRef.current = window.setTimeout(() => {
        setActiveTab("result");
      }, 1300);
    },
    [],
  );

  useEffect(() => {
    if (roomFromUrl) {
      setRoomId(roomFromUrl);
      setMode("group");
    }
  }, [roomFromUrl]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedOrigin = window.localStorage.getItem("travel-darts-origin-prefecture") ?? "";
    const stored =
      window.localStorage.getItem("travel-darts-participant-name") ?? makeParticipantName();
    setOriginPrefecture(storedOrigin);
    window.localStorage.setItem("travel-darts-participant-name", stored);
    setParticipantName(stored);
    setParticipants([stored]);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (originPrefecture) {
      window.localStorage.setItem("travel-darts-origin-prefecture", originPrefecture);
      return;
    }

    window.localStorage.removeItem("travel-darts-origin-prefecture");
  }, [originPrefecture]);

  useEffect(() => {
    return () => {
      if (resultTimerRef.current) {
        window.clearTimeout(resultTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (mode !== "group" || !roomId || !participantName) {
      if (participantName) {
        setParticipants([participantName]);
      }
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setParticipants([participantName]);
      setStatusLabel("Supabase未設定: ローカルのみ");
      setShareLabel(
        "NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY を設定すると同期します",
      );
      return;
    }

    const channel = supabase.channel(`travel-darts-room-${roomId}`, {
      config: {
        presence: {
          key: participantName,
        },
        broadcast: {
          self: false,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on("broadcast", { event: "dart-throw" }, ({ payload }) => {
        const data = payload as RealtimePayload;
        const destination = findDestinationByPrefecture(data.prefecture);

        if (!destination) {
          return;
        }

        setStatusLabel(`${data.thrownBy} さんがダーツを投げました`);
        beginThrow(destination, data.dartStyleId, data.token, data.thrownBy);
      })
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState<{ name?: string }>();
        const names = new Set<string>();

        Object.values(presenceState).forEach((entries) => {
          entries.forEach((entry) => {
            if (entry.name) {
              names.add(entry.name);
            }
          });
        });

        if (participantName) {
          names.add(participantName);
        }

        setParticipants(Array.from(names).sort((left, right) => left.localeCompare(right, "ja")));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setStatusLabel(`ROOM ${roomId} で LIVE 中`);
          setShareLabel("招待URLを共有すると同じダーツ結果が同期されます");
          await channel.track({
            name: participantName,
            joinedAt: new Date().toISOString(),
          });
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setStatusLabel("Realtime接続で少し迷子です");
          setShareLabel("Supabase Realtime の有効化を確認してください");
        }

        if (status === "CLOSED") {
          setStatusLabel("LIVE接続を終了しました");
        }
      });

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [beginThrow, mode, participantName, roomId]);

  const handleThrow = useCallback(async () => {
    if (visibleDestinations.length === 0) {
      setShareLabel("条件に合う行き先がありません。設定タブで少し広げてみましょう");
      setActiveTab("settings");
      return;
    }

    const destination = getRandomDestination(visibleDestinations);
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setStatusLabel(
      mode === "group" && participantName
        ? `${participantName} さんが ${destination.prefecture} を命中！`
        : `${destination.prefecture} に着弾しました`,
    );
    setResultShareLabel("URLコピー");
    beginThrow(destination, selectedStyleId, token, participantName);

    if (mode === "group" && roomId && channelRef.current) {
      await channelRef.current.send({
        type: "broadcast",
        event: "dart-throw",
        payload: {
          token,
          prefecture: destination.prefecture,
          dartStyleId: selectedStyleId,
          thrownBy: participantName || "旅人",
        } satisfies RealtimePayload,
      });
    }
  }, [beginThrow, mode, participantName, roomId, selectedStyleId, visibleDestinations]);

  const handleReset = useCallback(() => {
    if (resultTimerRef.current) {
      window.clearTimeout(resultTimerRef.current);
    }

    setCurrentThrow(null);
    setSelectedDestination(null);
    setStatusLabel(mode === "group" ? "もう一度ダーツを投げられます" : "旅先を決め直せます");
    setActiveTab("darts");
  }, [mode]);

  const handleRetry = useCallback(() => {
    setCurrentThrow(null);
    setActiveTab("darts");
  }, []);

  const handleModeChange = useCallback(
    (nextMode: TravelMode) => {
      setMode(nextMode);

      if (nextMode === "group") {
        const nextRoom = roomId || makeShortId();
        setRoomId(nextRoom);
        setStatusLabel(`ROOM ${nextRoom} を準備しています`);
        syncRoomInUrl(nextRoom);
        setActiveTab("darts");
        return;
      }

      setRoomId("");
      setParticipants(participantName ? [participantName] : []);
      setStatusLabel("ひとり旅モード");
      setShareLabel("URL をコピーして招待できます");
      syncRoomInUrl(null);
    },
    [participantName, roomId, syncRoomInUrl],
  );

  const handleToggleArea = useCallback((area: AreaTag) => {
    setFilters((current) => {
      if (area === "全国") {
        return { ...current, areas: ["全国"] };
      }

      const currentAreas = current.areas.filter((value) => value !== "全国");
      const nextAreas = toggleMulti(currentAreas, area);

      return {
        ...current,
        areas: nextAreas.length === 0 ? ["全国"] : nextAreas,
      };
    });
  }, []);

  const handleToggleBudget = useCallback((budget: TravelBudgetTag) => {
    setFilters((current) => ({
      ...current,
      budgets: toggleMulti(current.budgets, budget),
    }));
  }, []);

  const handleOriginChange = useCallback((prefecture: string) => {
    setOriginPrefecture(prefecture);
  }, []);

  const handleOriginClear = useCallback(() => {
    setOriginPrefecture("");
  }, []);

  const handleToggleDuration = useCallback((duration: TravelDurationTag) => {
    setFilters((current) => ({
      ...current,
      durations: toggleMulti(current.durations, duration),
    }));
  }, []);

  const handleToggleStyle = useCallback((style: TravelStyleTag) => {
    setFilters((current) => ({
      ...current,
      styles: toggleMulti(current.styles, style),
    }));
  }, []);

  const handleShareRoom = useCallback(async () => {
    if (typeof window === "undefined" || !roomId) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("room", roomId);

    try {
      if (navigator.share) {
        await navigator.share({
          title: "旅●ダーツ",
          text: `旅●ダーツのルーム ${roomId} に参加しよう`,
          url: url.toString(),
        });
        setShareLabel("共有シートを開きました");
        return;
      }

      await navigator.clipboard.writeText(url.toString());
      setShareLabel("招待URLをコピーしました");
    } catch {
      setShareLabel("共有をキャンセルしました");
    }
  }, [roomId]);

  const handleShareResult = useCallback(async () => {
    if (typeof window === "undefined" || !selectedDestination) {
      return;
    }

    const url = new URL(window.location.href);
    const shareText = `旅●ダーツで「${selectedDestination.prefecture}」が出ました！ ${url.toString()}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "旅●ダーツの結果",
          text: shareText,
          url: url.toString(),
        });
        setResultShareLabel("共有シートを開きました");
        return;
      }

      await navigator.clipboard.writeText(shareText);
      setResultShareLabel("結果テキストをコピーしました");
    } catch {
      setResultShareLabel("共有をキャンセルしました");
    }
  }, [selectedDestination]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "settings", label: "設定" },
    { id: "darts", label: "ダーツ" },
    { id: "result", label: "結果" },
  ];
  const selectedStyle = DART_STYLES.find((style) => style.id === selectedStyleId) ?? DART_STYLES[0];
  const selectedBudgetTitle = originPrefecture ? "現在地からの目安予算" : "目安予算";
  const selectedBudgetLabel = selectedDestination
    ? formatBudgetLabel(selectedDestination, originPrefecture)
    : "";
  const selectedBudgetCaption = formatBudgetCaption(originPrefecture);

  const helperText =
    visibleDestinations.length > 0
      ? `候補は ${visibleDestinations.length} 件。${selectedDestination ? `前回の結果は ${selectedDestination.prefecture}` : "旅先を選ぶ準備ができています"}`
      : "条件に合う行き先がありません。設定タブでフィルターを調整してください";

  return (
    <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[760px] flex-col gap-5">
        <section className="paper-panel rounded-[34px] border border-black/[0.06] p-6 shadow-elevated sm:p-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-black/36">
                Travel Darts
              </p>
              <h1 className="mt-3 font-heading text-[2.2rem] font-semibold leading-[0.98] tracking-tight text-sumi sm:text-[2.9rem]">
                旅●ダーツ
              </h1>
              <p className="mt-3 max-w-[36rem] text-sm leading-7 text-black/56">
                旅先をランダムに選ぶ体験を、できるだけ静かで洗練された UI にまとめたトラベルダーツです。
              </p>
            </div>
            <div className="w-fit rounded-[22px] border border-black/[0.06] bg-white/88 px-4 py-3 text-left shadow-soft sm:min-w-[10rem] sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/38">
                Travel Mode
              </p>
              <p className="mt-1 text-sm font-medium text-black/80">
                {mode === "group" ? "みんなで" : "ひとり旅"}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[22px] bg-black/[0.04] p-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleModeChange("solo")}
                className={`rounded-[16px] px-4 py-3 text-sm font-medium transition ${
                  mode === "solo"
                    ? "bg-white text-sumi shadow-soft"
                    : "text-black/54 hover:text-black/80"
                }`}
              >
                ひとり旅
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("group")}
                className={`rounded-[16px] px-4 py-3 text-sm font-medium transition ${
                  mode === "group"
                    ? "bg-white text-sumi shadow-soft"
                    : "text-black/54 hover:text-black/80"
                }`}
              >
                みんなで
              </button>
            </div>
          </div>
        </section>

        {mode === "group" && roomId ? (
          <LiveBadge
            roomId={roomId}
            participants={participants}
            statusLabel={statusLabel}
            onShareRoom={handleShareRoom}
            shareLabel={shareLabel}
          />
        ) : null}

        <section className="paper-panel flex-1 rounded-[34px] border border-black/[0.06] p-5 shadow-elevated sm:p-6">
          {activeTab === "settings" ? (
            <SettingsPanel
              filters={filters}
              selectedStyleId={selectedStyleId}
              originPrefecture={originPrefecture}
              onSelectStyle={setSelectedStyleId}
              onChangeOrigin={handleOriginChange}
              onClearOrigin={handleOriginClear}
              onToggleArea={handleToggleArea}
              onToggleBudget={handleToggleBudget}
              onToggleDuration={handleToggleDuration}
              onToggleStyle={handleToggleStyle}
              matchCount={visibleDestinations.length}
            />
          ) : null}

          {activeTab === "darts" ? (
            <div className="space-y-5">
              {!hasSupabaseEnv() && mode === "group" ? (
                <div className="rounded-[24px] border border-[#d7deea] bg-[#f8fbff] px-4 py-4 text-sm leading-7 text-black/62 shadow-soft">
                  Supabase の環境変数が未設定のため、今はこの端末上で演出確認まで動作します。Realtime 同期を有効にする場合は
                  <span className="font-semibold"> .env.local </span>
                  に
                  <span className="font-semibold">
                    {" "}
                    NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                  </span>
                  を設定してください。
                </div>
              ) : null}

              <DartMap
                currentThrow={currentThrow}
                selectedDestination={selectedDestination}
                displayStyleId={currentThrow?.dartStyleId ?? lastThrowStyleId}
                onThrow={handleThrow}
                onReset={handleReset}
                disabled={visibleDestinations.length === 0}
                helperText={helperText}
              />

              <div className="rounded-[24px] border border-black/[0.06] bg-white/90 px-5 py-5 shadow-soft">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/38">
                  Selection
                </p>
                <p className="mt-2 text-sm leading-7 text-black/62">
                  現在のマーカーは「{selectedStyle.emoji} {selectedStyle.label}」。
                  {originPrefecture
                    ? ` 予算は ${originPrefecture} 発を前提に計算します。`
                    : " 現在地を入れると、予算の目安がもっと現実的になります。"}
                </p>
              </div>
            </div>
          ) : null}

          {activeTab === "result" ? (
            <ResultPanel
              destination={selectedDestination}
              budgetTitle={selectedBudgetTitle}
              budgetLabel={selectedBudgetLabel}
              budgetCaption={selectedBudgetCaption}
              onRetry={handleRetry}
              onShare={handleShareResult}
              shareLabel={resultShareLabel}
            />
          ) : null}
        </section>

        <nav className="sticky bottom-4 z-10 rounded-[26px] border border-black/[0.06] bg-white/80 p-1.5 shadow-elevated backdrop-blur-xl">
          <ul className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-[18px] px-3 py-3 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? "bg-brand text-white shadow-soft"
                      : "bg-transparent text-black/52 hover:text-black/78"
                  }`}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
