/**
 * KMB / LWB Open Data helper service
 * Handles route stops lookup, stop details caching, and origin-destination matching.
 * Reference: https://data.gov.hk/tc-data/dataset/hk-td-tis_21-etakmb
 */

export interface StopInfo {
  stopId: string;
  nameTc: string;
  nameEn: string;
  nameSc: string;
  lat?: string;
  long?: string;
}

export interface RouteStopItem {
  route: string;
  bound: 'O' | 'I';
  serviceType: number;
  seq: number;
  stopId: string;
}

// In-memory caches to prevent redundant network round-trips
const stopCache = new Map<string, StopInfo>();
const routeStopsCache = new Map<string, RouteStopItem[]>();

/**
 * Normalizes text for lenient fuzzy matching (removes spaces, punctuation, lowercase, common abbreviations)
 */
export function normalizeKeyword(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '')
    .replace(/station/g, '')
    .replace(/mtr/g, '')
    .replace(/terminus/g, '')
    .replace(/bus/g, '')
    .replace(/站/g, '')
    .replace(/總站/g, '')
    .replace(/centre/g, 'center')
    .replace(/center/g, 'center');
}

/**
 * Fetches stop details by stop ID with in-memory caching
 */
export async function getStopDetails(stopId: string): Promise<StopInfo | null> {
  const cached = stopCache.get(stopId);
  if (cached) return cached;

  try {
    const res = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop/${encodeURIComponent(stopId)}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Xiaozhi-AI-MCP-Center/1.0',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.data) return null;

    const info: StopInfo = {
      stopId: json.data.stop,
      nameTc: json.data.name_tc || '',
      nameEn: json.data.name_en || '',
      nameSc: json.data.name_sc || '',
      lat: json.data.lat,
      long: json.data.long,
    };
    stopCache.set(stopId, info);
    return info;
  } catch (err) {
    console.warn(`Failed to fetch stop details for ${stopId}:`, err);
    return null;
  }
}

/**
 * Fetches stops along a specific route and direction (e.g. 71A outbound / inbound)
 */
export async function getRouteStops(
  route: string,
  bound: 'O' | 'I',
  serviceType: number = 1
): Promise<RouteStopItem[]> {
  const cacheKey = `${route.toUpperCase()}_${bound}_${serviceType}`;
  const cached = routeStopsCache.get(cacheKey);
  if (cached) return cached;

  const boundParam = bound === 'O' ? 'outbound' : 'inbound';
  try {
    const res = await fetch(
      `https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${encodeURIComponent(route)}/${boundParam}/${serviceType}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Xiaozhi-AI-MCP-Center/1.0',
        },
      }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const list: any[] = json.data || [];
    const parsed: RouteStopItem[] = list.map((item) => ({
      route: item.route,
      bound: item.bound as 'O' | 'I',
      serviceType: Number(item.service_type || 1),
      seq: Number(item.seq),
      stopId: item.stop,
    }));

    routeStopsCache.set(cacheKey, parsed);
    return parsed;
  } catch (err) {
    console.warn(`Failed to fetch route-stop for ${route} ${bound}:`, err);
    return [];
  }
}

export interface MatchResult {
  bound: 'O' | 'I';
  boardingSeq: number;
  boardingStop: StopInfo;
  destinationSeq?: number;
  destinationStop?: StopInfo;
}

/**
 * Resolves the appropriate direction and boarding stop given user's origin & destination queries.
 * Handles English, Cantonese, Traditional Chinese, and landmarks like "taipo market MTR" -> "大埔墟站".
 */
export async function resolveRouteStop(
  route: string,
  serviceType: number = 1,
  originQuery?: string,
  destinationQuery?: string
): Promise<MatchResult | null> {
  const cleanRoute = route.trim().toUpperCase();
  const cleanOrigin = originQuery ? normalizeKeyword(originQuery) : '';
  const cleanDest = destinationQuery ? normalizeKeyword(destinationQuery) : '';

  if (!cleanOrigin && !cleanDest) return null;

  // Fetch stops for both Outbound and Inbound in parallel
  const [outStops, inStops] = await Promise.all([
    getRouteStops(cleanRoute, 'O', serviceType),
    getRouteStops(cleanRoute, 'I', serviceType),
  ]);

  const allStopIds = [...new Set([...outStops.map((s) => s.stopId), ...inStops.map((s) => s.stopId)])];

  // Warm stop cache for all stops on this route
  await Promise.all(allStopIds.map((id) => getStopDetails(id)));

  // Score candidate matches across directions
  interface Candidate {
    bound: 'O' | 'I';
    originMatch?: { seq: number; stop: StopInfo };
    destMatch?: { seq: number; stop: StopInfo };
    isValidSequence: boolean;
  }

  const checkBound = (bound: 'O' | 'I', stops: RouteStopItem[]): Candidate => {
    let originMatch: { seq: number; stop: StopInfo } | undefined;
    let destMatch: { seq: number; stop: StopInfo } | undefined;

    for (const rs of stops) {
      const details = stopCache.get(rs.stopId);
      if (!details) continue;

      const normTc = normalizeKeyword(details.nameTc);
      const normEn = normalizeKeyword(details.nameEn);

      if (cleanOrigin) {
        // e.g. "taipomarket" in "taipomarketstation" or "大埔墟" in "大埔墟站"
        if (
          normTc.includes(cleanOrigin) ||
          cleanOrigin.includes(normTc) ||
          normEn.includes(cleanOrigin) ||
          cleanOrigin.includes(normEn)
        ) {
          if (!originMatch || rs.seq < originMatch.seq) {
            originMatch = { seq: rs.seq, stop: details };
          }
        }
      }

      if (cleanDest) {
        // e.g. "taipocenter" in "taipocentrephase5" or "大埔中心" in "大埔中心第五期"
        if (
          normTc.includes(cleanDest) ||
          cleanDest.includes(normTc) ||
          normEn.includes(cleanDest) ||
          cleanDest.includes(normEn)
        ) {
          if (!destMatch || rs.seq > destMatch.seq) {
            destMatch = { seq: rs.seq, stop: details };
          }
        }
      }
    }

    let isValidSequence = true;
    if (originMatch && destMatch) {
      // Must be travelling forward along the route
      isValidSequence = originMatch.seq < destMatch.seq;
    }

    return {
      bound,
      originMatch,
      destMatch,
      isValidSequence,
    };
  };

  const candIn = checkBound('I', inStops);
  const candOut = checkBound('O', outStops);

  // Pick candidate that matches both origin and destination with valid forward sequence
  let chosen: Candidate | null = null;
  if (candIn.originMatch && candIn.destMatch && candIn.isValidSequence) {
    chosen = candIn;
  } else if (candOut.originMatch && candOut.destMatch && candOut.isValidSequence) {
    chosen = candOut;
  } else if (candIn.originMatch && candIn.isValidSequence) {
    chosen = candIn;
  } else if (candOut.originMatch && candOut.isValidSequence) {
    chosen = candOut;
  } else if (candIn.destMatch) {
    // If only dest matched, board at first terminus stop (seq 1)
    const firstStop = inStops.find((s) => s.seq === 1);
    const stopDetails = firstStop ? stopCache.get(firstStop.stopId) : undefined;
    if (stopDetails) {
      candIn.originMatch = { seq: 1, stop: stopDetails };
      chosen = candIn;
    }
  } else if (candOut.destMatch) {
    const firstStop = outStops.find((s) => s.seq === 1);
    const stopDetails = firstStop ? stopCache.get(firstStop.stopId) : undefined;
    if (stopDetails) {
      candOut.originMatch = { seq: 1, stop: stopDetails };
      chosen = candOut;
    }
  }

  if (chosen && chosen.originMatch) {
    return {
      bound: chosen.bound,
      boardingSeq: chosen.originMatch.seq,
      boardingStop: chosen.originMatch.stop,
      destinationSeq: chosen.destMatch?.seq,
      destinationStop: chosen.destMatch?.stop,
    };
  }

  return null;
}
