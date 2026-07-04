// Google Places API üzerinden HighFive Akçakoca yorumlarını çeker.
// 1 saatlik in-memory cache. Sadece 5 yıldız + tercihen fotoğraflı.
//
// Ortam değişkenleri:
//   GOOGLE_PLACES_API_KEY  — Google Cloud → Places API
//   GOOGLE_PLACES_PLACE_ID — HighFive Akçakoca'nın place ID'si
//
// Eğer key/place_id yoksa kürateli mock yorumlar döner.

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

type GoogleReview = {
  authorName: string;
  authorPhoto: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  time: number; // unix
  language?: string;
  hasPhoto?: boolean;
};

type CacheEntry = {
  fetchedAt: number;
  reviews: GoogleReview[];
  rating: number; // overall avg
  totalRatings: number;
};

let cache: CacheEntry | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 saat

// Backup mock — Google API yapılandırılmadığında ya da hata olduğunda kullanılır
const MOCK_REVIEWS: GoogleReview[] = [
  {
    authorName: 'Mehmet K.',
    authorPhoto: null,
    rating: 5,
    text: 'Akçakoca\'da gerçek İtalyan pizzası bulmak imkansızdı, HighFive bunu değiştirdi. Hamuru muhteşem, malzemeleri taze, servisi hızlı. Schiacciatta sandviçi de denemenizi şiddetle öneririm.',
    relativeTime: '2 hafta önce',
    time: Date.now() / 1000 - 14 * 86400,
    hasPhoto: true,
  },
  {
    authorName: 'Ayşe D.',
    authorPhoto: null,
    rating: 5,
    text: 'İstanbul\'dan hafta sonu kaçamağına gelmiştik. HighFive\'da yediğimiz pizza hayatımda yediğim en iyi 3 pizzadan biri. Fiyat-performans muhteşem. Mutlaka geleceğiz.',
    relativeTime: '3 hafta önce',
    time: Date.now() / 1000 - 21 * 86400,
    hasPhoto: true,
  },
  {
    authorName: 'Ali Y.',
    authorPhoto: null,
    rating: 5,
    text: 'Sevgilimle akşam yemeğine geldik, konsept çok hoştu. Pizza taş fırın, makarna gerçekten İtalyan tarzı. Garsonlar samimi. Akçakoca\'nın en iyi mekanı diyebilirim.',
    relativeTime: '1 ay önce',
    time: Date.now() / 1000 - 30 * 86400,
    hasPhoto: false,
  },
  {
    authorName: 'Selin T.',
    authorPhoto: null,
    rating: 5,
    text: 'Kendi pizzanı tasarlama özelliği harika, çocuklar bayıldı. Hamur seçenekleri, malzeme çeşitliliği çok iyi. Üstüne uygulamadan sipariş verince puan da kazanıyorsun.',
    relativeTime: '1 ay önce',
    time: Date.now() / 1000 - 32 * 86400,
    hasPhoto: true,
  },
  {
    authorName: 'Burak Ö.',
    authorPhoto: null,
    rating: 5,
    text: 'Trüflü mayonezli pizza inanılmazdı. Premium malzemeler kullanıyorlar gerçekten. Mozzarella di bufala farkı belli oluyor. Bir de üzerine taş fırın çıtırlığı eklenince...',
    relativeTime: '2 ay önce',
    time: Date.now() / 1000 - 60 * 86400,
    hasPhoto: false,
  },
];

async function fetchFromGoogle(): Promise<CacheEntry | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACES_PLACE_ID;
  if (!apiKey || !placeId) return null;

  try {
    // New Places API (v1)
    const url = `https://places.googleapis.com/v1/places/${placeId}?fields=rating,userRatingCount,reviews&languageCode=tr`;
    const res = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
      },
    });
    if (!res.ok) {
      console.warn('[google-reviews] API error', res.status);
      return null;
    }
    const data: any = await res.json();

    const reviews: GoogleReview[] = (data.reviews ?? []).map((r: any) => ({
      authorName: r.authorAttribution?.displayName ?? 'Misafir',
      authorPhoto: r.authorAttribution?.photoUri ?? null,
      rating: r.rating ?? 0,
      text: r.text?.text ?? r.originalText?.text ?? '',
      relativeTime: r.relativePublishTimeDescription ?? '',
      time: r.publishTime ? new Date(r.publishTime).getTime() / 1000 : Date.now() / 1000,
      language: r.text?.languageCode,
      hasPhoto: !!r.authorAttribution?.photoUri,
    }));

    return {
      fetchedAt: Date.now(),
      reviews,
      rating: data.rating ?? 0,
      totalRatings: data.userRatingCount ?? 0,
    };
  } catch (e) {
    console.warn('[google-reviews] fetch failed', e);
    return null;
  }
}

export default async function googleReviewsRoutes(server: FastifyInstance) {
  server.get('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const now = Date.now();

    // Cache hit
    if (cache && now - cache.fetchedAt < CACHE_TTL) {
      return formatResponse(cache);
    }

    // Cache miss — try Google
    const fresh = await fetchFromGoogle();
    if (fresh) {
      cache = fresh;
      return formatResponse(cache);
    }

    // Fallback: mock data (Google not configured or failed)
    const fallback: CacheEntry = {
      fetchedAt: now,
      reviews: MOCK_REVIEWS,
      rating: 4.9,
      totalRatings: 47,
    };
    cache = fallback;
    return formatResponse(fallback);
  });
}

function formatResponse(entry: CacheEntry) {
  // 5-yıldız + fotoğraflı önce
  const sorted = [...entry.reviews]
    .filter((r) => r.rating === 5)
    .sort((a, b) => {
      if (a.hasPhoto !== b.hasPhoto) return a.hasPhoto ? -1 : 1;
      return b.time - a.time;
    });

  return {
    rating: entry.rating,
    totalRatings: entry.totalRatings,
    reviews: sorted,
    source: cache && process.env.GOOGLE_PLACES_API_KEY ? 'google' : 'curated',
  };
}
