#!/usr/bin/env node
// Downloads high-quality city images from Unsplash to public/images/destinations/{slug}.jpg
//
// Usage: UNSPLASH_ACCESS_KEY=<key> node scripts/download-destination-images.mjs
//
// Processes up to 45 cities per run (safe under the 50 req/hour demo limit).
// Re-running skips already-downloaded files; run again each hour for the next batch.
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(
  __dirname,
  '../apps/client/web/public/images/destinations',
);

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!ACCESS_KEY) {
  console.error('Error: UNSPLASH_ACCESS_KEY env var is required.');
  console.error(
    '  UNSPLASH_ACCESS_KEY=<key> node scripts/download-destination-images.mjs',
  );
  process.exit(1);
}

const BATCH_SIZE = 45;

mkdirSync(OUTPUT_DIR, { recursive: true });

const CITIES = [
  // United States
  { name: 'New York', slug: 'new-york', query: 'New York City skyline' },
  { name: 'Los Angeles', slug: 'los-angeles', query: 'Los Angeles cityscape' },
  { name: 'Chicago', slug: 'chicago', query: 'Chicago skyline architecture' },
  { name: 'Houston', slug: 'houston', query: 'Houston Texas city' },
  { name: 'Phoenix', slug: 'phoenix', query: 'Phoenix Arizona desert city' },
  {
    name: 'Philadelphia',
    slug: 'philadelphia',
    query: 'Philadelphia historic city',
  },
  { name: 'San Antonio', slug: 'san-antonio', query: 'San Antonio River Walk' },
  { name: 'San Diego', slug: 'san-diego', query: 'San Diego waterfront' },
  { name: 'Dallas', slug: 'dallas', query: 'Dallas Texas skyline' },
  { name: 'San Jose', slug: 'san-jose', query: 'San Jose California' },
  { name: 'Austin', slug: 'austin', query: 'Austin Texas skyline' },
  {
    name: 'San Francisco',
    slug: 'san-francisco',
    query: 'San Francisco Golden Gate',
  },
  { name: 'Seattle', slug: 'seattle', query: 'Seattle Space Needle skyline' },
  { name: 'Denver', slug: 'denver', query: 'Denver Colorado mountains' },
  {
    name: 'Nashville',
    slug: 'nashville',
    query: 'Nashville Tennessee music city',
  },
  {
    name: 'Las Vegas',
    slug: 'las-vegas',
    query: 'Las Vegas strip night lights',
  },
  { name: 'Miami', slug: 'miami', query: 'Miami beach art deco' },
  { name: 'Atlanta', slug: 'atlanta', query: 'Atlanta Georgia skyline' },
  { name: 'Boston', slug: 'boston', query: 'Boston historic waterfront' },
  {
    name: 'Washington DC',
    slug: 'washington-dc',
    query: 'Washington DC monuments',
  },
  {
    name: 'New Orleans',
    slug: 'new-orleans',
    query: 'New Orleans French Quarter balcony',
  },
  { name: 'Portland', slug: 'portland', query: 'Portland Oregon city bridges' },
  {
    name: 'Minneapolis',
    slug: 'minneapolis',
    query: 'Minneapolis Minnesota city',
  },
  { name: 'Sacramento', slug: 'sacramento', query: 'Sacramento California' },
  { name: 'Tampa', slug: 'tampa', query: 'Tampa Florida waterfront' },
  { name: 'Orlando', slug: 'orlando', query: 'Orlando Florida travel' },
  { name: 'Baltimore', slug: 'baltimore', query: 'Baltimore inner harbor' },
  {
    name: 'Honolulu',
    slug: 'honolulu',
    query: 'Honolulu Waikiki beach Hawaii',
  },
  {
    name: 'Salt Lake City',
    slug: 'salt-lake-city',
    query: 'Salt Lake City mountains',
  },
  { name: 'Raleigh', slug: 'raleigh', query: 'Raleigh North Carolina city' },
  { name: 'Memphis', slug: 'memphis', query: 'Memphis Tennessee blues music' },
  {
    name: 'Pittsburgh',
    slug: 'pittsburgh',
    query: 'Pittsburgh bridges skyline',
  },
  { name: 'St. Louis', slug: 'st-louis', query: 'St Louis Gateway Arch' },
  {
    name: 'Cincinnati',
    slug: 'cincinnati',
    query: 'Cincinnati Ohio riverfront',
  },
  {
    name: 'Kansas City',
    slug: 'kansas-city',
    query: 'Kansas City Missouri city',
  },
  { name: 'Columbus', slug: 'columbus', query: 'Columbus Ohio city' },
  {
    name: 'Indianapolis',
    slug: 'indianapolis',
    query: 'Indianapolis Indiana skyline',
  },
  {
    name: 'Charlotte',
    slug: 'charlotte',
    query: 'Charlotte North Carolina skyline',
  },
  { name: 'Louisville', slug: 'louisville', query: 'Louisville Kentucky city' },
  {
    name: 'Milwaukee',
    slug: 'milwaukee',
    query: 'Milwaukee Wisconsin lakefront',
  },
  { name: 'Detroit', slug: 'detroit', query: 'Detroit Michigan city skyline' },
  {
    name: 'Savannah',
    slug: 'savannah',
    query: 'Savannah Georgia squares moss',
  },
  {
    name: 'Charleston',
    slug: 'charleston',
    query: 'Charleston South Carolina historic',
  },
  {
    name: 'Asheville',
    slug: 'asheville',
    query: 'Asheville North Carolina mountains',
  },
  { name: 'Santa Fe', slug: 'santa-fe', query: 'Santa Fe New Mexico adobe' },
  { name: 'Key West', slug: 'key-west', query: 'Key West Florida sunset' },
  { name: 'Sedona', slug: 'sedona', query: 'Sedona Arizona red rocks' },
  { name: 'Napa', slug: 'napa', query: 'Napa Valley vineyards wine' },
  {
    name: 'Jackson Hole',
    slug: 'jackson-hole',
    query: 'Jackson Hole Wyoming mountains',
  },
  { name: 'Aspen', slug: 'aspen', query: 'Aspen Colorado ski mountains' },
  {
    name: 'Anchorage',
    slug: 'anchorage',
    query: 'Anchorage Alaska mountains nature',
  },
  {
    name: 'Albuquerque',
    slug: 'albuquerque',
    query: 'Albuquerque New Mexico balloon',
  },
  { name: 'Tucson', slug: 'tucson', query: 'Tucson Arizona saguaro desert' },
  {
    name: 'Oklahoma City',
    slug: 'oklahoma-city',
    query: 'Oklahoma City skyline',
  },
  { name: 'El Paso', slug: 'el-paso', query: 'El Paso Texas desert city' },
  {
    name: 'Jacksonville',
    slug: 'jacksonville',
    query: 'Jacksonville Florida river',
  },
  {
    name: 'Fort Worth',
    slug: 'fort-worth',
    query: 'Fort Worth Texas stockyards',
  },
  { name: 'Boise', slug: 'boise', query: 'Boise Idaho city foothills' },
  { name: 'Richmond', slug: 'richmond', query: 'Richmond Virginia historic' },
  // Canada
  { name: 'Toronto', slug: 'toronto', query: 'Toronto CN Tower skyline' },
  {
    name: 'Vancouver',
    slug: 'vancouver',
    query: 'Vancouver mountains waterfront',
  },
  {
    name: 'Montreal',
    slug: 'montreal',
    query: 'Montreal old city architecture',
  },
  {
    name: 'Quebec City',
    slug: 'quebec-city',
    query: 'Quebec City old town castle',
  },
  {
    name: 'Calgary',
    slug: 'calgary',
    query: 'Calgary downtown',
  },
  // Europe
  { name: 'London', slug: 'london', query: 'London Big Ben Thames' },
  { name: 'Paris', slug: 'paris', query: 'Paris Eiffel Tower romantic' },
  {
    name: 'Amsterdam',
    slug: 'amsterdam',
    query: 'Amsterdam canals architecture',
  },
  { name: 'Berlin', slug: 'berlin', query: 'Berlin Brandenburg Gate' },
  { name: 'Rome', slug: 'rome', query: 'Rome Colosseum historic' },
  { name: 'Madrid', slug: 'madrid', query: 'Madrid Spain architecture plaza' },
  {
    name: 'Barcelona',
    slug: 'barcelona',
    query: 'Barcelona Sagrada Familia Gaudi',
  },
  { name: 'Lisbon', slug: 'lisbon', query: 'Lisbon Portugal trams hills' },
  {
    name: 'Vienna',
    slug: 'vienna',
    query: 'Vienna Austria palace architecture',
  },
  { name: 'Prague', slug: 'prague', query: 'Prague castle bridge old town' },
  { name: 'Warsaw', slug: 'warsaw', query: 'Warsaw Poland old town square' },
  {
    name: 'Stockholm',
    slug: 'stockholm',
    query: 'Stockholm Sweden waterfront archipelago',
  },
  { name: 'Oslo', slug: 'oslo', query: 'Oslo Norway fjord city' },
  {
    name: 'Copenhagen',
    slug: 'copenhagen',
    query: 'Copenhagen Nyhavn colorful canal',
  },
  {
    name: 'Helsinki',
    slug: 'helsinki',
    query: 'Helsinki Finland harbor cathedral',
  },
  {
    name: 'Reykjavik',
    slug: 'reykjavik',
    query: 'Reykjavik Iceland northern lights',
  },
  { name: 'Dublin', slug: 'dublin', query: 'Dublin Ireland pub city' },
  {
    name: 'Zurich',
    slug: 'zurich',
    query: 'Zurich Switzerland lake mountains',
  },
  {
    name: 'Budapest',
    slug: 'budapest',
    query: 'Budapest Parliament Danube night',
  },
  { name: 'Athens', slug: 'athens', query: 'Athens Acropolis Parthenon' },
  {
    name: 'Istanbul',
    slug: 'istanbul',
    query: 'Istanbul Hagia Sophia Bosphorus',
  },
  {
    name: 'Dubrovnik',
    slug: 'dubrovnik',
    query: 'Dubrovnik Croatia old walls',
  },
  {
    name: 'Santorini',
    slug: 'santorini',
    query: 'Santorini blue domes white buildings',
  },
  { name: 'Porto', slug: 'porto', query: 'Porto Portugal colorful riverfront' },
  {
    name: 'Seville',
    slug: 'seville',
    query: 'Seville Spain cathedral',
  },
  { name: 'Florence', slug: 'florence', query: 'Florence Duomo Tuscany' },
  { name: 'Venice', slug: 'venice', query: 'Venice gondola canal romantic' },
  { name: 'Milan', slug: 'milan', query: 'Milan Duomo fashion Italy' },
  { name: 'Naples', slug: 'naples', query: 'Naples Italy Vesuvius city' },
  {
    name: 'Edinburgh',
    slug: 'edinburgh',
    query: 'Edinburgh Castle Scotland highlands',
  },
  { name: 'Krakow', slug: 'krakow', query: 'Krakow Poland market square' },
  {
    name: 'Tallinn',
    slug: 'tallinn',
    query: 'Tallinn Estonia medieval old town',
  },
  { name: 'Riga', slug: 'riga', query: 'Riga Latvia old town art nouveau' },
  {
    name: 'Vilnius',
    slug: 'vilnius',
    query: 'Vilnius Lithuania baroque old town',
  },
  { name: 'Nice', slug: 'nice', query: 'Nice French Riviera promenade' },
  { name: 'Bruges', slug: 'bruges', query: 'Bruges Belgium medieval canal' },
  { name: 'Geneva', slug: 'geneva', query: 'Geneva Switzerland lake fountain' },
  {
    name: 'Mykonos',
    slug: 'mykonos',
    query: 'Mykonos Greece white buildings windmills',
  },
  {
    name: 'Marrakech',
    slug: 'marrakech',
    query: 'Marrakech souk medina Morocco',
  },
  // Asia
  { name: 'Tokyo', slug: 'tokyo', query: 'Tokyo Japan skyline neon' },
  { name: 'Beijing', slug: 'beijing', query: 'Beijing Forbidden City China' },
  {
    name: 'Shanghai',
    slug: 'shanghai',
    query: 'Shanghai skyline Pudong night',
  },
  { name: 'Seoul', slug: 'seoul', query: 'Seoul South Korea city skyline' },
  {
    name: 'Singapore',
    slug: 'singapore',
    query: 'Singapore Marina Bay Sands night',
  },
  { name: 'Bangkok', slug: 'bangkok', query: 'Bangkok temple Thailand river' },
  {
    name: 'Hong Kong',
    slug: 'hong-kong',
    query: 'Hong Kong skyline harbor night',
  },
  { name: 'Taipei', slug: 'taipei', query: 'Taipei 101 Taiwan city' },
  { name: 'Osaka', slug: 'osaka', query: 'Osaka Japan castle food street' },
  { name: 'Kyoto', slug: 'kyoto', query: 'Kyoto Japan temple geisha bamboo' },
  {
    name: 'Kuala Lumpur',
    slug: 'kuala-lumpur',
    query: 'Kuala Lumpur Petronas towers',
  },
  { name: 'Jakarta', slug: 'jakarta', query: 'Jakarta Indonesia city skyline' },
  { name: 'Manila', slug: 'manila', query: 'Manila Philippines bay city' },
  { name: 'Hanoi', slug: 'hanoi', query: 'Hanoi Vietnam old quarter streets' },
  {
    name: 'Ho Chi Minh City',
    slug: 'ho-chi-minh-city',
    query: 'Ho Chi Minh City Vietnam skyline',
  },
  { name: 'Bali', slug: 'bali', query: 'Bali Indonesia beach' },
  {
    name: 'New Delhi',
    slug: 'new-delhi',
    query: 'New Delhi India Red Fort gate',
  },
  { name: 'Mumbai', slug: 'mumbai', query: 'Mumbai India Gateway skyline' },
  { name: 'Dubai', slug: 'dubai', query: 'Dubai Burj Khalifa skyline desert' },
  {
    name: 'Abu Dhabi',
    slug: 'abu-dhabi',
    query: 'Abu Dhabi Sheikh Zayed mosque',
  },
  { name: 'Doha', slug: 'doha', query: 'Doha Qatar skyline corniche' },
  { name: 'Muscat', slug: 'muscat', query: 'Muscat Oman harbor mosque' },
  {
    name: 'Kathmandu',
    slug: 'kathmandu',
    query: 'Kathmandu Nepal Himalaya temple',
  },
  { name: 'Colombo', slug: 'colombo', query: 'Colombo Sri Lanka city ocean' },
  {
    name: 'Ulaanbaatar',
    slug: 'ulaanbaatar',
    query: 'Ulaanbaatar Mongolia city steppe',
  },
  {
    name: 'Phnom Penh',
    slug: 'phnom-penh',
    query: 'Phnom Penh Cambodia',
  },
  { name: 'Yangon', slug: 'yangon', query: 'Yangon Myanmar Shwedagon pagoda' },
  { name: 'Dhaka', slug: 'dhaka', query: 'Dhaka Bangladesh river city' },
  {
    name: 'Karachi',
    slug: 'karachi',
    query: 'Karachi Pakistan city waterfront',
  },
  {
    name: 'Islamabad',
    slug: 'islamabad',
    query: 'Islamabad Pakistan Faisal mosque mountains',
  },
  {
    name: 'Tehran',
    slug: 'tehran',
    query: 'Tehran Iran Alborz mountains city',
  },
  {
    name: 'Jerusalem',
    slug: 'jerusalem',
    query: 'Jerusalem old city Dome of Rock',
  },
  { name: 'Tel Aviv', slug: 'tel-aviv', query: 'Tel Aviv Israel beach city' },
  { name: 'Amman', slug: 'amman', query: 'Amman Jordan ancient city' },
  {
    name: 'Beirut',
    slug: 'beirut',
    query: 'Beirut Lebanon Mediterranean city',
  },
  // Latin America
  {
    name: 'Mexico City',
    slug: 'mexico-city',
    query: 'Mexico City cathedral zocalo',
  },
  { name: 'Havana', slug: 'havana', query: 'Havana Cuba vintage cars Malecon' },
  { name: 'Bogota', slug: 'bogota', query: 'Bogota Colombia city mountains' },
  { name: 'Lima', slug: 'lima', query: 'Lima Peru Miraflores coast' },
  { name: 'Santiago', slug: 'santiago', query: 'Santiago Chile Andes skyline' },
  {
    name: 'Buenos Aires',
    slug: 'buenos-aires',
    query: 'Buenos Aires tango architecture',
  },
  {
    name: 'Rio de Janeiro',
    slug: 'rio-de-janeiro',
    query: 'Rio de Janeiro Christ beaches',
  },
  { name: 'Sao Paulo', slug: 'sao-paulo', query: 'Sao Paulo Brazil skyline' },
  {
    name: 'Cartagena',
    slug: 'cartagena',
    query: 'Cartagena Colombia colorful colonial',
  },
  {
    name: 'Medellin',
    slug: 'medellin',
    query: 'Medellin Colombia city mountains',
  },
  { name: 'Cusco', slug: 'cusco', query: 'Cusco Peru Machu Picchu Inca' },
  { name: 'Quito', slug: 'quito', query: 'Quito Ecuador colonial old town' },
  {
    name: 'Montevideo',
    slug: 'montevideo',
    query: 'Montevideo Uruguay waterfront city',
  },
  {
    name: 'Panama City',
    slug: 'panama-city',
    query: 'Panama City skyline canal',
  },
  // Africa
  { name: 'Cairo', slug: 'cairo', query: 'Cairo Egypt pyramids Nile' },
  { name: 'Nairobi', slug: 'nairobi', query: 'Nairobi Kenya city savanna' },
  {
    name: 'Cape Town',
    slug: 'cape-town',
    query: 'Cape Town Table Mountain harbor',
  },
  {
    name: 'Casablanca',
    slug: 'casablanca',
    query: 'Casablanca Morocco Hassan mosque',
  },
  {
    name: 'Johannesburg',
    slug: 'johannesburg',
    query: 'Johannesburg South Africa city',
  },
  {
    name: 'Addis Ababa',
    slug: 'addis-ababa',
    query: 'Addis Ababa Ethiopia city',
  },
  { name: 'Lagos', slug: 'lagos', query: 'Lagos Nigeria city waterfront' },
  { name: 'Accra', slug: 'accra', query: 'Accra Ghana city coast' },
  {
    name: 'Dar es Salaam',
    slug: 'dar-es-salaam',
    query: 'Dar es Salaam Tanzania harbor',
  },
  { name: 'Tunis', slug: 'tunis', query: 'Tunis Tunisia medina architecture' },
  // Australia and Pacific
  { name: 'Sydney', slug: 'sydney', query: 'Sydney Opera House Harbor Bridge' },
  {
    name: 'Melbourne',
    slug: 'melbourne',
    query: 'Melbourne Australia laneways city',
  },
  {
    name: 'Brisbane',
    slug: 'brisbane',
    query: 'Brisbane Australia river city',
  },
  { name: 'Perth', slug: 'perth', query: 'Perth Australia beach skyline' },
  {
    name: 'Auckland',
    slug: 'auckland',
    query: 'Auckland New Zealand harbor skyline',
  },
  {
    name: 'Wellington',
    slug: 'wellington',
    query: 'Wellington New Zealand harbor',
  },
  {
    name: 'Maldives',
    slug: 'maldives',
    query: 'Maldives overwater bungalow turquoise',
  },
  {
    name: 'Bora Bora',
    slug: 'bora-bora',
    query: 'Bora Bora lagoon overwater bungalow',
  },
];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function downloadCity(city) {
  const outputPath = path.join(OUTPUT_DIR, `${city.slug}.jpg`);
  if (existsSync(outputPath)) {
    return 'skip';
  }

  const searchUrl =
    `https://api.unsplash.com/search/photos` +
    `?query=${encodeURIComponent(city.query)}` +
    `&orientation=landscape&per_page=1&order_by=relevant`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  });

  if (!searchRes.ok) {
    console.error(`  error  ${city.name}: Unsplash search ${searchRes.status}`);
    return 'fail';
  }

  const data = await searchRes.json();
  const photo = data.results?.[0];

  if (!photo) {
    console.error(`  error  ${city.name}: no results for "${city.query}"`);
    return 'fail';
  }

  const imageUrl = `${photo.urls.raw}&w=1400&h=800&fit=crop&q=85`;

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    console.error(`  error  ${city.name}: image download ${imgRes.status}`);
    return 'fail';
  }

  const writer = createWriteStream(outputPath);
  await pipeline(imgRes.body, writer);
  console.log(`  saved  ${city.name}`);
  return 'ok';
}

const pending = CITIES.filter(
  (c) => !existsSync(path.join(OUTPUT_DIR, `${c.slug}.jpg`)),
);

if (pending.length === 0) {
  console.log('All cities already downloaded.');
  process.exit(0);
}

const batch = pending.slice(0, BATCH_SIZE);
const remaining = pending.length - batch.length;

console.log(
  `${pending.length} cities need images. Processing ${batch.length} this run.`,
);
if (remaining > 0) {
  console.log(
    `${remaining} will be downloaded on the next run (wait ~1 hour).\n`,
  );
} else {
  console.log('');
}

let ok = 0;
let fail = 0;

for (const city of batch) {
  const result = await downloadCity(city);
  if (result === 'ok') ok++;
  else if (result === 'fail') fail++;
  await delay(2000);
}

console.log(`\nDone. ${ok} saved, ${fail} failed.`);
if (remaining > 0) {
  console.log(
    `Run again in ~1 hour to download the next ${Math.min(remaining, BATCH_SIZE)}.`,
  );
}
if (fail > 0) process.exit(1);
