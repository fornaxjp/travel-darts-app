import {
  estimateBudgetAmount,
  findDestinationByPrefecture,
  type AreaTag,
  type Destination,
} from "@/lib/destinations";
import { getPrefectureMeta, type PrefectureMeta } from "@/lib/prefecture-meta";

type ProviderState = "live" | "fallback" | "unavailable" | "error";

export type ProviderStatus = {
  id: "weather" | "hotels" | "flights" | "transport";
  label: string;
  state: ProviderState;
  message: string;
  source: string;
};

export type WeatherInsight = {
  dateLabel: string;
  title: string;
  detail: string;
  temperatureLabel?: string;
  precipitationLabel?: string;
  source: string;
};

export type HotelOption = {
  name: string;
  area: string;
  priceLabel: string;
  detail: string;
  url: string;
  source: string;
  imageUrl?: string;
};

export type TransportOption = {
  mode: "flight" | "rail" | "car";
  title: string;
  detail: string;
  durationLabel: string;
  priceLabel: string;
  url: string;
  source: string;
};

export type FlightOption = {
  title: string;
  detail: string;
  priceLabel: string;
  durationLabel: string;
  url: string;
  source: string;
};

export type TravelPlanResponse = {
  destination: string;
  originPrefecture: string | null;
  departureDate: string;
  returnDate: string;
  nights: number;
  adults: number;
  summary: {
    headline: string;
    detail: string;
    budgetLabel: string;
    budgetCaption: string;
  };
  weather: WeatherInsight;
  hotelOptions: HotelOption[];
  transportOptions: TransportOption[];
  flightOptions: FlightOption[];
  providerStatuses: ProviderStatus[];
  notes: string[];
};

export type TravelPlanInput = {
  destinationPrefecture: string;
  originPrefecture?: string | null;
  departureDate?: string | null;
  nights?: number | null;
  adults?: number | null;
};

type ProviderBundle<T> = {
  data: T;
  status: ProviderStatus;
  note?: string;
};

type TravelRequestContext = {
  destination: Destination;
  destinationMeta: PrefectureMeta;
  origin: Destination | null;
  originMeta: PrefectureMeta | null;
  departureDate: string;
  returnDate: string;
  nights: number;
  adults: number;
};

const AREA_ORDER: AreaTag[] = ["東北", "関東", "中部", "関西", "中国・四国", "九州"];
const REMOTE_PREFECTURES = new Set(["北海道", "沖縄県"]);

function clampNumber(value: number | null | undefined, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, Math.round(value as number)));
}

function formatYen(value: number) {
  return `${Math.round(value).toLocaleString("ja-JP")}円`;
}

function extractFirstAmount(label: string) {
  const match = label.match(/([\d,]+)円/);
  return Number(match?.[1]?.replace(/,/g, "") ?? "0");
}

function roundToThousand(value: number) {
  return Math.max(1_000, Math.round(value / 1_000) * 1_000);
}

function getTodayIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00+09:00`);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00+09:00`);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function getDaysFromToday(dateString: string) {
  const today = new Date(`${getTodayIsoDate()}T00:00:00+09:00`);
  const target = new Date(`${dateString}T00:00:00+09:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function getTravelSeason(dateString: string) {
  const month = Number(dateString.slice(5, 7));

  if (month >= 3 && month <= 5) {
    return "春";
  }

  if (month >= 6 && month <= 8) {
    return "夏";
  }

  if (month >= 9 && month <= 11) {
    return "秋";
  }

  return "冬";
}

function getAreaDistance(left: AreaTag, right: AreaTag) {
  const leftIndex = AREA_ORDER.indexOf(left);
  const rightIndex = AREA_ORDER.indexOf(right);

  if (leftIndex === -1 || rightIndex === -1) {
    return 2;
  }

  return Math.abs(leftIndex - rightIndex);
}

function makeGoogleSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function parseAmadeusDuration(duration: string | undefined) {
  if (!duration) {
    return "所要時間は航空会社の表示に従います";
  }

  const hours = Number(duration.match(/(\d+)H/)?.[1] ?? "0");
  const minutes = Number(duration.match(/(\d+)M/)?.[1] ?? "0");
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours}時間`);
  }

  if (minutes > 0) {
    parts.push(`${minutes}分`);
  }

  return parts.length > 0 ? parts.join("") : "直行便ベース";
}

function parseWeatherCodeLabel(code: number | null | undefined) {
  const labelMap: Record<number, string> = {
    0: "快晴",
    1: "おおむね晴れ",
    2: "晴れ時々くもり",
    3: "くもり",
    45: "霧",
    48: "霧",
    51: "弱い霧雨",
    53: "霧雨",
    55: "強い霧雨",
    61: "弱い雨",
    63: "雨",
    65: "強い雨",
    71: "弱い雪",
    73: "雪",
    75: "強い雪",
    80: "にわか雨",
    81: "強いにわか雨",
    82: "激しいにわか雨",
    95: "雷雨",
  };

  return labelMap[code ?? -1] ?? "変わりやすい天気";
}

async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function getWeatherBundle(context: TravelRequestContext): Promise<ProviderBundle<WeatherInsight>> {
  const daysFromToday = getDaysFromToday(context.departureDate);
  const season = getTravelSeason(context.departureDate);

  if (daysFromToday < 0 || daysFromToday > 15) {
    return {
      data: {
        dateLabel: formatDateLabel(context.departureDate),
        title: `${season}旅の見どころ`,
        detail: `${context.destination.prefecture} は「${context.destination.season}」が特に相性の良い時期です。16日先以降は季節傾向ベースで案内しています。`,
        source: "destination data",
      },
      status: {
        id: "weather",
        label: "天気・時期",
        state: "fallback",
        message: "16日より先のため、季節データを使って案内しています。",
        source: "destination data",
      },
    };
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(context.destinationMeta.latitude));
  url.searchParams.set("longitude", String(context.destinationMeta.longitude));
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
  );
  url.searchParams.set("forecast_days", "16");
  url.searchParams.set("timezone", "Asia/Tokyo");

  try {
    const data = await fetchJson<{
      daily?: {
        time?: string[];
        weather_code?: number[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_probability_max?: number[];
      };
    }>(url.toString());

    const index = data.daily?.time?.findIndex((value) => value === context.departureDate) ?? -1;

    if (index === -1 || !data.daily) {
      throw new Error("forecast_not_found");
    }

    const weatherCode = data.daily.weather_code?.[index];
    const max = data.daily.temperature_2m_max?.[index];
    const min = data.daily.temperature_2m_min?.[index];
    const precipitation = data.daily.precipitation_probability_max?.[index];
    const weatherLabel = parseWeatherCodeLabel(weatherCode);

    return {
      data: {
        dateLabel: formatDateLabel(context.departureDate),
        title: `${weatherLabel} の見込み`,
        detail: `${context.destinationMeta.capital} 周辺の予報を基準に、出発日の雰囲気を見ています。`,
        temperatureLabel:
          typeof max === "number" && typeof min === "number"
            ? `${Math.round(min)}-${Math.round(max)}°C`
            : undefined,
        precipitationLabel:
          typeof precipitation === "number" ? `降水確率 ${Math.round(precipitation)}%` : undefined,
        source: "Open-Meteo",
      },
      status: {
        id: "weather",
        label: "天気・時期",
        state: "live",
        message: "Open-Meteo の16日予報を使っています。",
        source: "Open-Meteo",
      },
    };
  } catch {
    return {
      data: {
        dateLabel: formatDateLabel(context.departureDate),
        title: `${season}旅の目安`,
        detail: `${context.destination.prefecture} は「${context.destination.season}」が相性の良い時期です。予報が取れなかったため季節ベースで案内しています。`,
        source: "destination data",
      },
      status: {
        id: "weather",
        label: "天気・時期",
        state: "fallback",
        message: "天気APIに接続できなかったため、季節コメントへ切り替えました。",
        source: "destination data",
      },
    };
  }
}

function getFallbackNightlyRate(context: TravelRequestContext) {
  const tripBase = estimateBudgetAmount(
    context.destination,
    context.origin?.prefecture ?? null,
  );
  const perNight = roundToThousand(Math.max(8_000, tripBase * 0.28));
  return perNight;
}

function buildFallbackHotels(context: TravelRequestContext) {
  const nightlyRate = getFallbackNightlyRate(context);
  const { destinationMeta } = context;

  return [
    {
      name: `${destinationMeta.railHub} 周辺ステイ`,
      area: destinationMeta.capital,
      priceLabel: `1泊 ${formatYen(nightlyRate)} から`,
      detail: `まずは ${destinationMeta.railHub} 周辺を押さえると、到着後の移動が軽くなります。`,
      url: makeGoogleSearchUrl(`${context.destination.prefecture} ${destinationMeta.railHub} ホテル`),
      source: "fallback",
    },
    {
      name: `${destinationMeta.featuredArea} ステイ`,
      area: destinationMeta.featuredArea,
      priceLabel: `1泊 ${formatYen(roundToThousand(nightlyRate * 1.15))} から`,
      detail: `旅の主役を ${destinationMeta.featuredArea} に置くなら、この周辺へ寄せると回りやすいです。`,
      url: makeGoogleSearchUrl(`${context.destination.prefecture} ${destinationMeta.featuredArea} ホテル`),
      source: "fallback",
    },
    {
      name: `${destinationMeta.capital} 市内の連泊向け`,
      area: `${destinationMeta.capital}市内`,
      priceLabel: `1泊 ${formatYen(roundToThousand(nightlyRate * 0.95))} から`,
      detail: `${context.nights}泊なら、食事と交通の選択肢が広い市内滞在も安定です。`,
      url: makeGoogleSearchUrl(`${context.destination.prefecture} ${destinationMeta.capital} ホテル`),
      source: "fallback",
    },
  ] satisfies HotelOption[];
}

function normalizeRakutenHotel(hotel: unknown) {
  const entry = hotel as
    | {
        hotel?: Array<{
          hotelBasicInfo?: Record<string, unknown>;
          hotelRatingInfo?: Record<string, unknown>;
        }>;
        hotelBasicInfo?: Record<string, unknown>;
        hotelRatingInfo?: Record<string, unknown>;
      }
    | undefined;

  if (!entry) {
    return null;
  }

  const hotelBasicInfo =
    entry.hotelBasicInfo ??
    entry.hotel?.find((item) => item.hotelBasicInfo)?.hotelBasicInfo ??
    null;
  const hotelRatingInfo =
    entry.hotelRatingInfo ??
    entry.hotel?.find((item) => item.hotelRatingInfo)?.hotelRatingInfo ??
    null;

  if (!hotelBasicInfo) {
    return null;
  }

  return {
    hotelBasicInfo,
    hotelRatingInfo,
  };
}

async function getHotelBundle(context: TravelRequestContext): Promise<ProviderBundle<HotelOption[]>> {
  const applicationId = process.env.RAKUTEN_APPLICATION_ID?.trim();
  const accessKey = process.env.RAKUTEN_ACCESS_KEY?.trim();

  if (!applicationId || !accessKey) {
    return {
      data: buildFallbackHotels(context),
      status: {
        id: "hotels",
        label: "ホテル",
        state: "fallback",
        message: "楽天トラベルの認証情報が未設定のため、滞在エリア案を表示しています。",
        source: "fallback",
      },
      note: "RAKUTEN_APPLICATION_ID と RAKUTEN_ACCESS_KEY を入れると実際の宿名が出せます。",
    };
  }

  const url = new URL("https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426");
  url.searchParams.set("applicationId", applicationId);
  url.searchParams.set("accessKey", accessKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("keyword", `${context.destination.prefecture} ${context.destinationMeta.capital}`);
  url.searchParams.set("hits", "5");
  url.searchParams.set("page", "1");
  url.searchParams.set("searchField", "0");
  url.searchParams.set("responseType", "middle");
  url.searchParams.set("sort", "+roomCharge");

  try {
    const data = await fetchJson<{ hotels?: unknown[] }>(url.toString());
    const hotels = (data.hotels ?? [])
      .map(normalizeRakutenHotel)
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
      .slice(0, 3)
      .map(({ hotelBasicInfo, hotelRatingInfo }) => {
        const name = String(hotelBasicInfo.hotelName ?? "ホテル");
        const minCharge = Number(hotelBasicInfo.hotelMinCharge ?? 0);
        const address1 = String(hotelBasicInfo.address1 ?? "");
        const address2 = String(hotelBasicInfo.address2 ?? "");
        const access = String(hotelBasicInfo.access ?? "");
        const reviewAverage = Number(hotelRatingInfo?.reviewAverage ?? 0);
        const imageUrl = String(hotelBasicInfo.hotelImageUrl ?? hotelBasicInfo.hotelThumbnailUrl ?? "");

        return {
          name,
          area: `${address1}${address2}`.trim() || context.destinationMeta.capital,
          priceLabel:
            minCharge > 0 ? `1泊 ${formatYen(minCharge)} から` : "料金は楽天トラベルで確認",
          detail: `${access || `${context.destinationMeta.railHub} からのアクセスを確認しやすい宿です。`}${
            reviewAverage > 0 ? ` 評価 ${reviewAverage.toFixed(1)}。` : ""
          }`,
          url: String(
            hotelBasicInfo.planListUrl ??
              hotelBasicInfo.hotelInformationUrl ??
              makeGoogleSearchUrl(`${name} ${context.destination.prefecture}`),
          ),
          source: "Rakuten Travel",
          imageUrl: imageUrl || undefined,
        } satisfies HotelOption;
      });

    if (hotels.length === 0) {
      throw new Error("hotel_not_found");
    }

    return {
      data: hotels,
      status: {
        id: "hotels",
        label: "ホテル",
        state: "live",
        message: "楽天トラベル API から宿を提案しています。",
        source: "Rakuten Travel",
      },
    };
  } catch {
    return {
      data: buildFallbackHotels(context),
      status: {
        id: "hotels",
        label: "ホテル",
        state: "fallback",
        message: "楽天トラベルから取得できなかったため、滞在エリア案へ切り替えました。",
        source: "fallback",
      },
      note: "楽天トラベルが不安定なときは、エリアベースの宿泊案を表示します。",
    };
  }
}

async function getAmadeusAccessToken(baseUrl: string, clientId: string, clientSecret: string) {
  const response = await fetchJson<{
    access_token?: string;
  }>(`${baseUrl}/v1/security/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!response.access_token) {
    throw new Error("amadeus_token_missing");
  }

  return response.access_token;
}

async function getFlightBundle(context: TravelRequestContext): Promise<ProviderBundle<FlightOption[]>> {
  if (!context.origin || !context.originMeta) {
    return {
      data: [],
      status: {
        id: "flights",
        label: "飛行機",
        state: "unavailable",
        message: "現在地を入力すると、航空券の検索も有効になります。",
        source: "user input",
      },
    };
  }

  const originMeta = context.originMeta;
  const destinationMeta = context.destinationMeta;

  if (!originMeta.airportCode || !destinationMeta.airportCode) {
    return {
      data: [],
      status: {
        id: "flights",
        label: "飛行機",
        state: "fallback",
        message: "近隣空港コードが足りないため、航空券は概算案内のみです。",
        source: "fallback",
      },
    };
  }

  if (originMeta.airportCode === destinationMeta.airportCode) {
    return {
      data: [],
      status: {
        id: "flights",
        label: "飛行機",
        state: "unavailable",
        message: "同一空港圏のため、飛行機検索は省略しています。",
        source: "route logic",
      },
    };
  }

  const clientId = process.env.AMADEUS_CLIENT_ID?.trim();
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return {
      data: [],
      status: {
        id: "flights",
        label: "飛行機",
        state: "fallback",
        message: "Amadeus の認証情報が未設定のため、航空運賃は概算で表示します。",
        source: "fallback",
      },
      note: "AMADEUS_CLIENT_ID と AMADEUS_CLIENT_SECRET を入れると実際の航空券を検索できます。",
    };
  }

  const baseUrl = process.env.AMADEUS_BASE_URL?.trim() || "https://test.api.amadeus.com";

  try {
    const token = await getAmadeusAccessToken(baseUrl, clientId, clientSecret);
    const url = new URL(`${baseUrl}/v2/shopping/flight-offers`);
    url.searchParams.set("originLocationCode", originMeta.airportCode);
    url.searchParams.set("destinationLocationCode", destinationMeta.airportCode);
    url.searchParams.set("departureDate", context.departureDate);
    url.searchParams.set("returnDate", context.returnDate);
    url.searchParams.set("adults", String(context.adults));
    url.searchParams.set("max", "3");
    url.searchParams.set("currencyCode", "JPY");

    const data = await fetchJson<{
      data?: Array<{
        price?: { grandTotal?: string; total?: string };
        itineraries?: Array<{
          duration?: string;
          segments?: Array<{
            carrierCode?: string;
            departure?: { iataCode?: string };
            arrival?: { iataCode?: string };
          }>;
        }>;
      }>;
    }>(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const offers = (data.data ?? []).slice(0, 3).map((offer) => {
      const total = Number(offer.price?.grandTotal ?? offer.price?.total ?? "0");
      const outbound = offer.itineraries?.[0];
      const stops = Math.max(0, (outbound?.segments?.length ?? 1) - 1);
      const carrierCode = outbound?.segments?.map((segment) => segment.carrierCode).filter(Boolean).join(" / ");

      return {
        title: `${originMeta.airportName} → ${destinationMeta.airportName}`,
        detail: `${carrierCode || "航空会社確認中"} / ${stops === 0 ? "直行" : `${stops}回乗継`} の候補です。`,
        priceLabel:
          total > 0
            ? context.adults > 1
              ? `合計 ${formatYen(total)} / 1人あたり ${formatYen(total / context.adults)}`
              : `${formatYen(total)} / 往復`
            : "料金は Amadeus 上で確認",
        durationLabel: parseAmadeusDuration(outbound?.duration),
        url: makeGoogleSearchUrl(
          `${originMeta.airportName} ${destinationMeta.airportName} ${context.departureDate} 飛行機`,
        ),
        source: "Amadeus",
      } satisfies FlightOption;
    });

    if (offers.length === 0) {
      throw new Error("flight_not_found");
    }

    return {
      data: offers,
      status: {
        id: "flights",
        label: "飛行機",
        state: "live",
        message: "Amadeus の Flight Offers Search を使っています。",
        source: "Amadeus",
      },
      note: "Amadeus Self-Service は一部 LCC や一部航空会社を含まない場合があります。",
    };
  } catch {
    return {
      data: [],
      status: {
        id: "flights",
        label: "飛行機",
        state: "fallback",
        message: "Amadeus から取得できなかったため、航空券は概算案内のみです。",
        source: "fallback",
      },
      note: "Amadeus は一部航空会社や LCC を返さないことがあります。",
    };
  }
}

function estimateRailDuration(areaDistance: number) {
  const hours = 1.8 + areaDistance * 1.9;
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return minutes === 60 ? `${wholeHours + 1}時間` : `${wholeHours}時間${minutes}分`;
}

function estimateFlightDuration(areaDistance: number, remoteRoute: boolean) {
  const hours = remoteRoute ? 2.2 + areaDistance * 0.25 : 1.2 + areaDistance * 0.35;
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return minutes === 60 ? `${wholeHours + 1}時間` : `${wholeHours}時間${minutes}分`;
}

function estimateTransportPrice(context: TravelRequestContext, mode: "flight" | "rail" | "car") {
  const areaDistance = context.origin
    ? getAreaDistance(context.origin.areas[0], context.destination.areas[0])
    : 2;
  const remoteRoute =
    REMOTE_PREFECTURES.has(context.destination.prefecture) ||
    REMOTE_PREFECTURES.has(context.origin?.prefecture ?? "");

  if (mode === "flight") {
    return roundToThousand((12_000 + areaDistance * 7_000 + (remoteRoute ? 7_000 : 0)) * context.adults);
  }

  if (mode === "rail") {
    return roundToThousand((7_000 + areaDistance * 6_000 + (remoteRoute ? 4_000 : 0)) * context.adults);
  }

  return roundToThousand((4_000 + areaDistance * 3_500) * context.adults);
}

function buildTransportBundle(
  context: TravelRequestContext,
  flightOptions: FlightOption[],
): ProviderBundle<TransportOption[]> {
  const originLabel = context.originMeta?.railHub ?? "出発地";
  const destinationLabel = context.destinationMeta.railHub;
  const areaDistance = context.origin
    ? getAreaDistance(context.origin.areas[0], context.destination.areas[0])
    : 2;
  const remoteRoute =
    REMOTE_PREFECTURES.has(context.destination.prefecture) ||
    REMOTE_PREFECTURES.has(context.origin?.prefecture ?? "");

  const options: TransportOption[] = [];

  if (flightOptions.length > 0) {
    options.push({
      mode: "flight",
      title: "飛行機で行く",
      detail: `${flightOptions[0].detail} 空港アクセスも含めて比較すると現実的です。`,
      durationLabel: flightOptions[0].durationLabel,
      priceLabel: flightOptions[0].priceLabel,
      url: flightOptions[0].url,
      source: flightOptions[0].source,
    });
  } else if (context.origin && (remoteRoute || areaDistance >= 3)) {
    options.push({
      mode: "flight",
      title: "飛行機を第一候補にする",
      detail: `${context.originMeta?.airportName ?? "最寄り空港"} から ${
        context.destinationMeta.airportName ?? context.destination.prefecture
      } へ飛ぶと、現地滞在時間を確保しやすいです。`,
      durationLabel: `${estimateFlightDuration(areaDistance, remoteRoute)} + 空港移動`,
      priceLabel: `${formatYen(estimateTransportPrice(context, "flight"))} 前後 / ${context.adults}名`,
      url: makeGoogleSearchUrl(
        `${context.origin.prefecture} ${context.destination.prefecture} 飛行機 ${context.departureDate}`,
      ),
      source: "heuristic",
    });
  }

  if (!REMOTE_PREFECTURES.has(context.destination.prefecture)) {
    options.push({
      mode: "rail",
      title: areaDistance <= 1 ? "新幹線・特急で軽く移動" : "新幹線メインで向かう",
      detail: context.origin
        ? `${originLabel} から ${destinationLabel} へ。都心アクセスの安定感を重視するなら鉄道が堅実です。`
        : `${destinationLabel} を起点に組むなら、主要都市からの鉄道アクセスも安定しています。`,
      durationLabel:
        context.origin && context.origin.prefecture === context.destination.prefecture
          ? "1-2時間前後"
          : estimateRailDuration(areaDistance),
      priceLabel: `${formatYen(estimateTransportPrice(context, "rail"))} 前後 / ${context.adults}名`,
      url: makeGoogleSearchUrl(
        `${context.origin?.prefecture ?? "日本"} ${context.destination.prefecture} 新幹線`,
      ),
      source: "heuristic",
    });
  }

  if (!context.origin || areaDistance <= 1 || context.origin?.prefecture === context.destination.prefecture) {
    options.push({
      mode: "car",
      title: "レンタカーやローカル移動も相性良し",
      detail: `${context.destinationMeta.featuredArea} まで回るなら、現地で車を組み合わせると行程が組みやすくなります。`,
      durationLabel: context.origin ? "半日-1日で調整" : "現地移動向け",
      priceLabel: `${formatYen(estimateTransportPrice(context, "car"))} 前後 / ${context.adults}名`,
      url: makeGoogleSearchUrl(`${context.destination.prefecture} レンタカー 観光`),
      source: "heuristic",
    });
  }

  return {
    data: options.slice(0, 3),
    status: {
      id: "transport",
      label: "行き方",
      state: "fallback",
      message: context.origin
        ? "現在地と地域差から、飛行機・鉄道・車の現実的な候補を組み立てています。"
        : "現在地が未設定のため、一般的な移動候補を出しています。",
      source: "heuristic",
    },
  };
}

function buildSummary(
  context: TravelRequestContext,
  weather: WeatherInsight,
  hotels: HotelOption[],
  transportOptions: TransportOption[],
) {
  const hotelMinPerNight =
    hotels.map((hotel) => extractFirstAmount(hotel.priceLabel)).find((value) => value > 0) ??
    getFallbackNightlyRate(context);
  const roomCount = Math.max(1, Math.ceil(context.adults / 2));
  const transportEstimate =
    extractFirstAmount(transportOptions[0]?.priceLabel ?? "") || estimateTransportPrice(context, "rail");
  const foodAndLocal = 5_000 * context.adults * Math.max(1, context.nights);
  const hotelTotal = hotelMinPerNight * context.nights * roomCount;
  const total = roundToThousand(hotelTotal + transportEstimate + foodAndLocal);
  const perPerson = roundToThousand(total / context.adults);
  const originText = context.origin ? `${context.origin.prefecture} 発` : "現在地未設定";

  return {
    headline: `${formatDateLabel(context.departureDate)} 出発なら ${weather.title}`,
    detail:
      transportOptions[0] != null
        ? `${originText} では「${transportOptions[0].title}」を軸にすると、${context.destination.prefecture} まで無理なく組みやすいです。`
        : `${originText} のため、行き方は一般論ベースでまとめています。`,
    budgetLabel:
      context.adults > 1
        ? `合計 ${formatYen(total)} / 1人 ${formatYen(perPerson)} 前後`
        : `合計 ${formatYen(total)} 前後`,
    budgetCaption: `${context.nights}泊・${context.adults}名で、交通と宿の下限寄りを組み合わせた目安です。`,
  };
}

export async function createTravelPlan(input: TravelPlanInput): Promise<TravelPlanResponse> {
  const destination = findDestinationByPrefecture(input.destinationPrefecture);

  if (!destination) {
    throw new Error("destination_not_found");
  }

  const destinationMeta = getPrefectureMeta(destination.prefecture);

  if (!destinationMeta) {
    throw new Error("destination_meta_not_found");
  }

  const origin =
    input.originPrefecture && input.originPrefecture !== destination.prefecture
      ? findDestinationByPrefecture(input.originPrefecture) ?? null
      : null;
  const originMeta = origin ? getPrefectureMeta(origin.prefecture) ?? null : null;
  const departureDate =
    input.departureDate && /^\d{4}-\d{2}-\d{2}$/.test(input.departureDate)
      ? input.departureDate
      : addDays(getTodayIsoDate(), 14);
  const nights = clampNumber(input.nights, 1, 7);
  const adults = clampNumber(input.adults, 1, 8);
  const returnDate = addDays(departureDate, nights);

  const context: TravelRequestContext = {
    destination,
    destinationMeta,
    origin,
    originMeta,
    departureDate,
    returnDate,
    nights,
    adults,
  };

  const [weatherBundle, hotelBundle, flightBundle] = await Promise.all([
    getWeatherBundle(context),
    getHotelBundle(context),
    getFlightBundle(context),
  ]);
  const transportBundle = buildTransportBundle(context, flightBundle.data);
  const summary = buildSummary(
    context,
    weatherBundle.data,
    hotelBundle.data,
    transportBundle.data,
  );

  const notes = [
    weatherBundle.note,
    hotelBundle.note,
    flightBundle.note,
    flightBundle.status.state === "live"
      ? "Amadeus Self-Service は一部 LCC や一部航空会社の在庫を含まないことがあります。"
      : null,
  ].filter((value): value is string => Boolean(value));

  return {
    destination: destination.prefecture,
    originPrefecture: origin?.prefecture ?? null,
    departureDate,
    returnDate,
    nights,
    adults,
    summary,
    weather: weatherBundle.data,
    hotelOptions: hotelBundle.data,
    transportOptions: transportBundle.data,
    flightOptions: flightBundle.data,
    providerStatuses: [
      weatherBundle.status,
      hotelBundle.status,
      flightBundle.status,
      transportBundle.status,
    ],
    notes,
  };
}
