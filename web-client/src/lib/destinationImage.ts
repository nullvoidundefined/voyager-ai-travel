// Static map of city names to Unsplash photo IDs.
// Only the ~30 curated cities are listed — others get the gradient fallback.
const CITY_IMAGES: Record<string, string> = {
  tokyo: '1540959733332-eab848b19436',
  paris: '1502602898657-3e91760cbb34',
  'new york': '1534430480872-3498386e7856',
  london: '1513635269975-59663e0ac1ad',
  barcelona: '1583422409516-2895a77efded',
  rome: '1552832230-c0197dd311b5',
  sydney: '1506973035872-a4ec16b8e8d9',
  dubai: '1512453913961-1491d39ae3fc',
  singapore: '1525625293386-3f8f99389edd',
  seoul: '1517154421773-0529f29ea451',
  lisbon: '1555881400-74d7acaacd8b',
  istanbul: '1524231757912-21f4fe3a7200',
  bangkok: '1508009603885-50cf7c579365',
  'cape town': '1580060839134-75a5edca2e99',
  amsterdam: '1534351590666-13e3e96b5017',
  prague: '1519677100203-a0e668c92439',
  vienna: '1516550893923-42d28e5677af',
  budapest: '1549923746-c502d488b3ea',
  'rio de janeiro': '1483729558449-99ef09a8c325',
  bali: '1537996194471-e657df975ab4',
  santorini: '1570077188670-e3a8d69ac5ff',
  kyoto: '1493976040374-85c8e12f0c0e',
  marrakech: '1489749798305-4fea3ae63d43',
  reykjavik: '1504829857797-ddff29c27927',
  dubrovnik: '1555990538-1e15a10e4c61',
  'mexico city': '1518659526054-e25d4cec600a',
  lima: '1531968455002-3498ae6027a1',
  mumbai: '1529253355930-ddbe423a2ac7',
  auckland: '1507699580474-99cf7c0cf42d',
  havana: '1500759285222-a95626b934cb',
};

export function getDestinationImageUrl(
  unsplashId: string,
  width: number,
  height: number,
): string {
  return `https://images.unsplash.com/photo-${unsplashId}?w=${width}&h=${height}&fit=crop&q=80`;
}

export function getDestinationImage(cityName: string): {
  url: string | null;
  unsplashId: string | null;
} {
  const key = cityName.toLowerCase().trim();
  const id = CITY_IMAGES[key] ?? null;
  return {
    url: id
      ? `https://images.unsplash.com/photo-${id}?w=800&h=400&fit=crop&q=80`
      : null,
    unsplashId: id,
  };
}

// Hero carousel images — 5 curated destinations
export const HERO_IMAGES = [
  { city: 'Santorini', id: CITY_IMAGES['santorini']! },
  { city: 'Tokyo', id: CITY_IMAGES['tokyo']! },
  { city: 'Paris', id: CITY_IMAGES['paris']! },
  { city: 'Bali', id: CITY_IMAGES['bali']! },
  { city: 'New York', id: CITY_IMAGES['new york']! },
];
