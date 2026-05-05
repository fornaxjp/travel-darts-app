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
        const budgetMatch = matchesAny(filters.budgets, destination.budgetTags);
        const durationMatch = matchesAny(filters.durations, destination.durationTags);
        const styleMatch = matchesAny(filters.styles, destination.styleTags);

        return areaMatch && budgetMatch && durationMatch && styleMatch;
      }),
    [filters],
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

    const stored =
      window.localStorage.getItem("travel-darts-participant-name") ?? makeParticipantName();
    window.localStorage.setItem("travel-darts-participant-name", stored);
    setParticipantName(stored);
    setParticipants([stored]);
  }, []);

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

  const helperText =
    visibleDestinations.length > 0
      ? `${visibleDestinations.length}件の候補から狙い撃ち。${selectedDestination ? `前回は ${selectedDestination.prefecture}` : "準備OK"}`
      : "条件に合う行き先がありません。設定タブでフィルターを調整してください";

  return (
    <main className="px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[480px] flex-col gap-4">
        <section className="paper-panel rounded-[32px] border-2 border-black p-5 shadow-pop">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-black/45">
                Wasabi Trip Game
              </p>
              <h1 className="mt-2 font-heading text-[2.3rem] font-semibold leading-[0.95] text-sumi sm:text-[2.6rem]">
                旅●ダーツ
              </h1>
              <p className="mt-3 text-sm leading-7 text-black/70">
                ひと投げで、次の日本旅を決める和ポップなダーツアプリ。
              </p>
            </div>
            <div className="w-fit rounded-[20px] border-2 border-black bg-shuiro px-3 py-2 text-left text-white shadow-pop-sm sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
                Realtime
              </p>
              <p className="mt-1 text-sm font-semibold">
                {mode === "group" ? "みんなで" : "ひとり旅"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleModeChange("solo")}
              className={`rounded-2xl border-2 border-black px-4 py-3 text-sm font-bold shadow-pop-sm ${
                mode === "solo" ? "bg-black text-white" : "bg-white text-black"
              }`}
            >
              ひとり旅
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("group")}
              className={`rounded-2xl border-2 border-black px-4 py-3 text-sm font-bold shadow-pop-sm ${
                mode === "group" ? "bg-mizu text-white" : "bg-white text-black"
              }`}
            >
              みんなで
            </button>
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

        <section className="paper-panel flex-1 rounded-[32px] border-2 border-black p-5 shadow-pop">
          {activeTab === "settings" ? (
            <SettingsPanel
              filters={filters}
              selectedStyleId={selectedStyleId}
              onSelectStyle={setSelectedStyleId}
              onToggleArea={handleToggleArea}
              onToggleBudget={handleToggleBudget}
              onToggleDuration={handleToggleDuration}
              onToggleStyle={handleToggleStyle}
              matchCount={visibleDestinations.length}
            />
          ) : null}

          {activeTab === "darts" ? (
            <div className="space-y-4">
              {!hasSupabaseEnv() && mode === "group" ? (
                <div className="rounded-[20px] border-2 border-black bg-[#fff2db] px-4 py-3 text-sm text-black shadow-pop-sm">
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

              <div className="rounded-[22px] border-2 border-black bg-white px-4 py-4 shadow-pop-sm">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45">
                  Current Settings
                </p>
                <p className="mt-2 text-sm leading-7 text-black/75">
                  的スタイルは「{selectedStyle.emoji} {selectedStyle.label}」を選択中。命中から0.8秒後に自動で結果タブへ移動します。
                </p>
              </div>
            </div>
          ) : null}

          {activeTab === "result" ? (
            <ResultPanel
              destination={selectedDestination}
              onRetry={handleRetry}
              onShare={handleShareResult}
              shareLabel={resultShareLabel}
            />
          ) : null}
        </section>

        <nav className="sticky bottom-3 z-10 rounded-[28px] border-2 border-black bg-black p-2 shadow-pop">
          <ul className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-2xl px-3 py-3 text-sm font-bold transition ${
                    activeTab === tab.id
                      ? "bg-washi text-black"
                      : "bg-transparent text-white/80"
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
