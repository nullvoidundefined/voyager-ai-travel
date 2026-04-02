import type { ChatNode } from '@agentic-travel-agent/shared-types';
import { fetchStateDeptAdvisory } from './enrichment-sources/state-dept.js';
import { fetchFCDOAdvisory } from './enrichment-sources/fcdo.js';
import { fetchWeatherForecast } from './enrichment-sources/open-meteo.js';
import { getDrivingRequirements } from './enrichment-sources/driving.js';
import { getVisaRequirement } from './enrichment-sources/visa-matrix.js';

// Coordinates for major destinations
const CITY_COORDS: Record<string, { lat: number; lon: number; country: string }> = {
  // North America — USA
  'new york': { lat: 40.7128, lon: -74.006, country: 'US' },
  'los angeles': { lat: 34.0522, lon: -118.2437, country: 'US' },
  chicago: { lat: 41.8781, lon: -87.6298, country: 'US' },
  miami: { lat: 25.7617, lon: -80.1918, country: 'US' },
  'las vegas': { lat: 36.1699, lon: -115.1398, country: 'US' },
  'san francisco': { lat: 37.7749, lon: -122.4194, country: 'US' },
  orlando: { lat: 28.5383, lon: -81.3792, country: 'US' },
  honolulu: { lat: 21.3069, lon: -157.8583, country: 'US' },
  washington: { lat: 38.9072, lon: -77.0369, country: 'US' },
  boston: { lat: 42.3601, lon: -71.0589, country: 'US' },
  seattle: { lat: 47.6062, lon: -122.3321, country: 'US' },
  // North America — Canada & Mexico
  toronto: { lat: 43.6532, lon: -79.3832, country: 'CA' },
  vancouver: { lat: 49.2827, lon: -123.1207, country: 'CA' },
  montreal: { lat: 45.5017, lon: -73.5673, country: 'CA' },
  'mexico city': { lat: 19.4326, lon: -99.1332, country: 'MX' },
  cancun: { lat: 21.1619, lon: -86.8515, country: 'MX' },
  guadalajara: { lat: 20.6597, lon: -103.3496, country: 'MX' },
  // Central America & Caribbean
  'san jose': { lat: 9.9281, lon: -84.0907, country: 'CR' },
  panama: { lat: 8.9936, lon: -79.5197, country: 'PA' },
  'panama city': { lat: 8.9936, lon: -79.5197, country: 'PA' },
  havana: { lat: 23.1136, lon: -82.3666, country: 'CU' },
  kingston: { lat: 17.9970, lon: -76.7936, country: 'JM' },
  'santo domingo': { lat: 18.4861, lon: -69.9312, country: 'DO' },
  'port-au-prince': { lat: 18.5944, lon: -72.3074, country: 'HT' },
  bridgetown: { lat: 13.0975, lon: -59.6167, country: 'BB' },
  'port of spain': { lat: 10.6549, lon: -61.5019, country: 'TT' },
  nassau: { lat: 25.0480, lon: -77.3554, country: 'BS' },
  // South America
  bogota: { lat: 4.711, lon: -74.0721, country: 'CO' },
  medellin: { lat: 6.2476, lon: -75.5658, country: 'CO' },
  lima: { lat: -12.0464, lon: -77.0428, country: 'PE' },
  'sao paulo': { lat: -23.5505, lon: -46.6333, country: 'BR' },
  'rio de janeiro': { lat: -22.9068, lon: -43.1729, country: 'BR' },
  brasilia: { lat: -15.7975, lon: -47.8919, country: 'BR' },
  'buenos aires': { lat: -34.6037, lon: -58.3816, country: 'AR' },
  santiago: { lat: -33.4489, lon: -70.6693, country: 'CL' },
  caracas: { lat: 10.4806, lon: -66.9036, country: 'VE' },
  quito: { lat: -0.1807, lon: -78.4678, country: 'EC' },
  montevideo: { lat: -34.9011, lon: -56.1645, country: 'UY' },
  asuncion: { lat: -25.2867, lon: -57.647, country: 'PY' },
  'la paz': { lat: -16.5, lon: -68.15, country: 'BO' },
  // Western Europe
  london: { lat: 51.5074, lon: -0.1278, country: 'GB' },
  edinburgh: { lat: 55.9533, lon: -3.1883, country: 'GB' },
  paris: { lat: 48.8566, lon: 2.3522, country: 'FR' },
  nice: { lat: 43.7102, lon: 7.262, country: 'FR' },
  barcelona: { lat: 41.3874, lon: 2.1686, country: 'ES' },
  madrid: { lat: 40.4168, lon: -3.7038, country: 'ES' },
  seville: { lat: 37.3891, lon: -5.9845, country: 'ES' },
  rome: { lat: 41.9028, lon: 12.4964, country: 'IT' },
  milan: { lat: 45.4654, lon: 9.1859, country: 'IT' },
  venice: { lat: 45.4408, lon: 12.3155, country: 'IT' },
  florence: { lat: 43.7696, lon: 11.2558, country: 'IT' },
  berlin: { lat: 52.52, lon: 13.405, country: 'DE' },
  munich: { lat: 48.1351, lon: 11.582, country: 'DE' },
  hamburg: { lat: 53.5753, lon: 10.0153, country: 'DE' },
  amsterdam: { lat: 52.3676, lon: 4.9041, country: 'NL' },
  brussels: { lat: 50.8503, lon: 4.3517, country: 'BE' },
  zurich: { lat: 47.3769, lon: 8.5417, country: 'CH' },
  geneva: { lat: 46.2044, lon: 6.1432, country: 'CH' },
  vienna: { lat: 48.2082, lon: 16.3738, country: 'AT' },
  lisbon: { lat: 38.7223, lon: -9.1393, country: 'PT' },
  porto: { lat: 41.1579, lon: -8.6291, country: 'PT' },
  stockholm: { lat: 59.3293, lon: 18.0686, country: 'SE' },
  oslo: { lat: 59.9139, lon: 10.7522, country: 'NO' },
  copenhagen: { lat: 55.6761, lon: 12.5683, country: 'DK' },
  helsinki: { lat: 60.1699, lon: 24.9384, country: 'FI' },
  reykjavik: { lat: 64.1265, lon: -21.8174, country: 'IS' },
  dublin: { lat: 53.3498, lon: -6.2603, country: 'IE' },
  // Eastern Europe & Balkans
  athens: { lat: 37.9838, lon: 23.7275, country: 'GR' },
  prague: { lat: 50.0755, lon: 14.4378, country: 'CZ' },
  budapest: { lat: 47.4979, lon: 19.0402, country: 'HU' },
  warsaw: { lat: 52.2297, lon: 21.0122, country: 'PL' },
  krakow: { lat: 50.0647, lon: 19.945, country: 'PL' },
  bucharest: { lat: 44.4268, lon: 26.1025, country: 'RO' },
  sofia: { lat: 42.6977, lon: 23.3219, country: 'BG' },
  zagreb: { lat: 45.815, lon: 15.9819, country: 'HR' },
  dubrovnik: { lat: 42.6507, lon: 18.0944, country: 'HR' },
  belgrade: { lat: 44.7866, lon: 20.4489, country: 'RS' },
  ljubljana: { lat: 46.0569, lon: 14.5058, country: 'SI' },
  bratislava: { lat: 48.1486, lon: 17.1077, country: 'SK' },
  vilnius: { lat: 54.6872, lon: 25.2797, country: 'LT' },
  riga: { lat: 56.9496, lon: 24.1052, country: 'LV' },
  tallinn: { lat: 59.437, lon: 24.7536, country: 'EE' },
  // Middle East
  istanbul: { lat: 41.0082, lon: 28.9784, country: 'TR' },
  ankara: { lat: 39.9334, lon: 32.8597, country: 'TR' },
  dubai: { lat: 25.2048, lon: 55.2708, country: 'AE' },
  'abu dhabi': { lat: 24.4539, lon: 54.3773, country: 'AE' },
  riyadh: { lat: 24.6877, lon: 46.7219, country: 'SA' },
  doha: { lat: 25.2854, lon: 51.531, country: 'QA' },
  'kuwait city': { lat: 29.3759, lon: 47.9774, country: 'KW' },
  muscat: { lat: 23.5880, lon: 58.3829, country: 'OM' },
  manama: { lat: 26.2235, lon: 50.5876, country: 'BH' },
  amman: { lat: 31.9522, lon: 35.9332, country: 'JO' },
  'tel aviv': { lat: 32.0853, lon: 34.7818, country: 'IL' },
  jerusalem: { lat: 31.7683, lon: 35.2137, country: 'IL' },
  beirut: { lat: 33.8938, lon: 35.5018, country: 'LB' },
  // Central & South Asia
  tbilisi: { lat: 41.6938, lon: 44.8015, country: 'GE' },
  yerevan: { lat: 40.1872, lon: 44.5152, country: 'AM' },
  baku: { lat: 40.4093, lon: 49.8671, country: 'AZ' },
  almaty: { lat: 43.2220, lon: 76.8512, country: 'KZ' },
  tashkent: { lat: 41.2995, lon: 69.2401, country: 'UZ' },
  samarkand: { lat: 39.6542, lon: 66.9597, country: 'UZ' },
  mumbai: { lat: 19.076, lon: 72.8777, country: 'IN' },
  delhi: { lat: 28.7041, lon: 77.1025, country: 'IN' },
  'new delhi': { lat: 28.6139, lon: 77.209, country: 'IN' },
  bangalore: { lat: 12.9716, lon: 77.5946, country: 'IN' },
  kolkata: { lat: 22.5726, lon: 88.3639, country: 'IN' },
  goa: { lat: 15.2993, lon: 74.124, country: 'IN' },
  jaipur: { lat: 26.9124, lon: 75.7873, country: 'IN' },
  agra: { lat: 27.1767, lon: 78.0081, country: 'IN' },
  islamabad: { lat: 33.6844, lon: 73.0479, country: 'PK' },
  lahore: { lat: 31.5497, lon: 74.3436, country: 'PK' },
  karachi: { lat: 24.8607, lon: 67.0011, country: 'PK' },
  dhaka: { lat: 23.8103, lon: 90.4125, country: 'BD' },
  colombo: { lat: 6.9271, lon: 79.8612, country: 'LK' },
  kathmandu: { lat: 27.7172, lon: 85.324, country: 'NP' },
  // East & Southeast Asia
  cairo: { lat: 30.0444, lon: 31.2357, country: 'EG' },
  tokyo: { lat: 35.6762, lon: 139.6503, country: 'JP' },
  osaka: { lat: 34.6937, lon: 135.5023, country: 'JP' },
  kyoto: { lat: 35.0116, lon: 135.7681, country: 'JP' },
  'hong kong': { lat: 22.3193, lon: 114.1694, country: 'HK' },
  macau: { lat: 22.1987, lon: 113.5439, country: 'MO' },
  taipei: { lat: 25.033, lon: 121.5654, country: 'TW' },
  seoul: { lat: 37.5665, lon: 126.978, country: 'KR' },
  busan: { lat: 35.1796, lon: 129.0756, country: 'KR' },
  beijing: { lat: 39.9042, lon: 116.4074, country: 'CN' },
  shanghai: { lat: 31.2304, lon: 121.4737, country: 'CN' },
  chengdu: { lat: 30.5728, lon: 104.0668, country: 'CN' },
  'xi an': { lat: 34.3416, lon: 108.9398, country: 'CN' },
  ulaanbaatar: { lat: 47.8864, lon: 106.9057, country: 'MN' },
  hanoi: { lat: 21.0285, lon: 105.8542, country: 'VN' },
  'ho chi minh city': { lat: 10.8231, lon: 106.6297, country: 'VN' },
  'hoi an': { lat: 15.8801, lon: 108.338, country: 'VN' },
  bangkok: { lat: 13.7563, lon: 100.5018, country: 'TH' },
  'chiang mai': { lat: 18.7061, lon: 98.9817, country: 'TH' },
  phuket: { lat: 7.8804, lon: 98.3923, country: 'TH' },
  'phnom penh': { lat: 11.5564, lon: 104.9282, country: 'KH' },
  'siem reap': { lat: 13.3671, lon: 103.8448, country: 'KH' },
  'vientiane': { lat: 17.9757, lon: 102.6331, country: 'LA' },
  luang: { lat: 19.8845, lon: 102.1348, country: 'LA' },
  yangon: { lat: 16.8661, lon: 96.1951, country: 'MM' },
  'kuala lumpur': { lat: 3.139, lon: 101.6869, country: 'MY' },
  penang: { lat: 5.4141, lon: 100.3288, country: 'MY' },
  singapore: { lat: 1.3521, lon: 103.8198, country: 'SG' },
  jakarta: { lat: -6.2088, lon: 106.8456, country: 'ID' },
  bali: { lat: -8.3405, lon: 115.092, country: 'ID' },
  ubud: { lat: -8.5069, lon: 115.2625, country: 'ID' },
  manila: { lat: 14.5995, lon: 120.9842, country: 'PH' },
  cebu: { lat: 10.3157, lon: 123.8854, country: 'PH' },
  // Oceania
  sydney: { lat: -33.8688, lon: 151.2093, country: 'AU' },
  melbourne: { lat: -37.8136, lon: 144.9631, country: 'AU' },
  brisbane: { lat: -27.4698, lon: 153.0251, country: 'AU' },
  'gold coast': { lat: -28.0167, lon: 153.4, country: 'AU' },
  perth: { lat: -31.9505, lon: 115.8605, country: 'AU' },
  cairns: { lat: -16.9186, lon: 145.7781, country: 'AU' },
  auckland: { lat: -36.8485, lon: 174.7633, country: 'NZ' },
  queenstown: { lat: -45.0312, lon: 168.6626, country: 'NZ' },
  christchurch: { lat: -43.5321, lon: 172.6362, country: 'NZ' },
  wellington: { lat: -41.2865, lon: 174.7762, country: 'NZ' },
  suva: { lat: -18.1416, lon: 178.4419, country: 'FJ' },
  'port moresby': { lat: -6.3149, lon: 147.1803, country: 'PG' },
  // Africa — North
  marrakech: { lat: 31.6295, lon: -7.9811, country: 'MA' },
  casablanca: { lat: 33.5731, lon: -7.5898, country: 'MA' },
  fez: { lat: 34.0181, lon: -5.0078, country: 'MA' },
  tunis: { lat: 36.8065, lon: 10.1815, country: 'TN' },
  algiers: { lat: 36.7372, lon: 3.0862, country: 'DZ' },
  // Africa — Sub-Saharan
  'cape town': { lat: -33.9249, lon: 18.4241, country: 'ZA' },
  johannesburg: { lat: -26.2041, lon: 28.0473, country: 'ZA' },
  durban: { lat: -29.8587, lon: 31.0218, country: 'ZA' },
  nairobi: { lat: -1.2921, lon: 36.8219, country: 'KE' },
  mombasa: { lat: -4.0435, lon: 39.6682, country: 'KE' },
  'dar es salaam': { lat: -6.7924, lon: 39.2083, country: 'TZ' },
  zanzibar: { lat: -6.1659, lon: 39.2026, country: 'TZ' },
  kampala: { lat: 0.3476, lon: 32.5825, country: 'UG' },
  kigali: { lat: -1.9441, lon: 30.0619, country: 'RW' },
  addis: { lat: 9.145, lon: 40.4897, country: 'ET' },
  'addis ababa': { lat: 9.0249, lon: 38.7469, country: 'ET' },
  accra: { lat: 5.6037, lon: -0.187, country: 'GH' },
  lagos: { lat: 6.5244, lon: 3.3792, country: 'NG' },
  abuja: { lat: 9.0765, lon: 7.3986, country: 'NG' },
  dakar: { lat: 14.7167, lon: -17.4677, country: 'SN' },
  'abidjan': { lat: 5.3599, lon: -4.0083, country: 'CI' },
  windhoek: { lat: -22.5597, lon: 17.0832, country: 'NA' },
  gaborone: { lat: -24.6282, lon: 25.9231, country: 'BW' },
  lusaka: { lat: -15.4167, lon: 28.2833, country: 'ZM' },
  harare: { lat: -17.8252, lon: 31.0335, country: 'ZW' },
  maputo: { lat: -25.9692, lon: 32.5732, country: 'MZ' },
  antananarivo: { lat: -18.9137, lon: 47.5361, country: 'MG' },
  'port louis': { lat: -20.1609, lon: 57.4977, country: 'MU' },
  victoria: { lat: -4.6796, lon: 55.4919, country: 'SC' },
  // Russia & CIS
  moscow: { lat: 55.7558, lon: 37.6173, country: 'RU' },
  'st petersburg': { lat: 59.9311, lon: 30.3609, country: 'RU' },
  'saint petersburg': { lat: 59.9311, lon: 30.3609, country: 'RU' },
  minsk: { lat: 53.9045, lon: 27.5615, country: 'BY' },
  kyiv: { lat: 50.4501, lon: 30.5234, country: 'UA' },
  odessa: { lat: 46.4825, lon: 30.7233, country: 'UA' },
  chisinau: { lat: 47.0105, lon: 28.8638, country: 'MD' },
};

function lookupCity(
  destination: string,
): { lat: number; lon: number; country: string } | null {
  const key = destination.toLowerCase().trim();
  return CITY_COORDS[key] ?? null;
}

export async function getEnrichmentNodes(
  destination: string,
  originCountry?: string,
): Promise<ChatNode[]> {
  const city = lookupCity(destination);
  if (!city) return [];

  // Synchronous sources — compute before the async fan-out
  const drivingNode = getDrivingRequirements(city.country);
  const visaNode = originCountry ? getVisaRequirement(originCountry, city.country) : null;

  const asyncResults = await Promise.allSettled([
    fetchStateDeptAdvisory(city.country),
    fetchFCDOAdvisory(city.country),
    fetchWeatherForecast(city.lat, city.lon),
  ]);

  const nodes: ChatNode[] = [];

  for (const result of asyncResults) {
    if (result.status === 'fulfilled' && result.value) {
      if (Array.isArray(result.value)) {
        nodes.push(...result.value);
      } else {
        nodes.push(result.value);
      }
    }
  }

  if (drivingNode) nodes.push(drivingNode);
  if (visaNode) nodes.push(visaNode);

  return nodes;
}
