import type { Archetype, CommunicationStyle, Persona } from '../types.js';

interface ArchetypeTemplate {
  archetype: Archetype;
  budget_range: [number, number] | null;
  travel_party: string[];
  travelers_range: [number, number];
  trip_type: ('round_trip' | 'one_way')[];
  communication_styles: CommunicationStyle[];
  goals_pool: string[];
  constraints: string;
  personas_per_run: number;
}

const DESTINATIONS = [
  'Tokyo',
  'Paris',
  'New York',
  'London',
  'Barcelona',
  'Rome',
  'Bali',
  'Sydney',
  'Dubai',
  'Singapore',
  'Seoul',
  'Lisbon',
  'Istanbul',
  'Bangkok',
  'Cape Town',
  'Amsterdam',
  'Prague',
  'Vienna',
  'Budapest',
  'Rio de Janeiro',
  'Santorini',
  'Kyoto',
  'Marrakech',
  'Reykjavik',
  'Dubrovnik',
  'Auckland',
  'Lima',
  'Mexico City',
  'Mumbai',
  'Havana',
  'Naples',
  'Cusco',
  'Maldives',
];

const ORIGINS = [
  'San Francisco',
  'New York',
  'Los Angeles',
  'Chicago',
  'Miami',
  'Seattle',
  'Boston',
  'Denver',
  'Atlanta',
  'Dallas',
];

const TEMPLATES: ArchetypeTemplate[] = [
  {
    archetype: 'budget_backpacker',
    budget_range: [500, 1500],
    travel_party: ['solo'],
    travelers_range: [1, 1],
    trip_type: ['round_trip', 'one_way'],
    communication_styles: ['terse', 'conversational'],
    goals_pool: [
      'find the cheapest flight available',
      'book a hostel or budget hotel under $50/night',
      'skip car rental',
      'find free or cheap local experiences',
      'find street food recommendations',
    ],
    constraints:
      'Cheapest everything. Hostel-friendly. Maximize days on minimal budget.',
    personas_per_run: 3,
  },
  {
    archetype: 'luxury_couple',
    budget_range: [5000, 15000],
    travel_party: ['romantic-partner'],
    travelers_range: [2, 2],
    trip_type: ['round_trip'],
    communication_styles: ['detailed', 'conversational'],
    goals_pool: [
      'book a 4-5 star hotel with ocean or city view',
      'find a fine dining restaurant',
      'book a couples spa experience',
      'find a sunset cruise or romantic excursion',
      'arrange airport transfer or luxury car rental',
    ],
    constraints:
      'High-end hotels, fine dining, premium experiences. Comfort over cost.',
    personas_per_run: 2,
  },
  {
    archetype: 'family_vacation',
    budget_range: [3000, 8000],
    travel_party: ['family-with-kids'],
    travelers_range: [3, 5],
    trip_type: ['round_trip'],
    communication_styles: ['detailed', 'conversational'],
    goals_pool: [
      'find a family-friendly hotel with pool',
      'book kid-friendly activities',
      'find restaurants with kids menus',
      'rent a car with car seat',
      'find indoor activities in case of rain',
      'keep activities close together to minimize travel time',
    ],
    constraints:
      'Kid-friendly, safety-conscious. No late-night activities. Manageable logistics.',
    personas_per_run: 3,
  },
  {
    archetype: 'adventure_seeker',
    budget_range: [2000, 6000],
    travel_party: ['solo', 'friends'],
    travelers_range: [1, 4],
    trip_type: ['round_trip', 'one_way'],
    communication_styles: ['conversational', 'impatient'],
    goals_pool: [
      'find outdoor adventure activities (hiking, diving, surfing)',
      'book a unique stay (treehouse, eco-lodge, glamping)',
      'find local guided tours off the beaten path',
      'skip fine dining — find authentic local food',
      'rent a car or motorbike for exploring',
    ],
    constraints:
      'Outdoor activities, off-beaten-path destinations. Adventure over comfort.',
    personas_per_run: 3,
  },
  {
    archetype: 'business_traveler',
    budget_range: [2000, 5000],
    travel_party: ['solo'],
    travelers_range: [1, 1],
    trip_type: ['round_trip'],
    communication_styles: ['terse', 'impatient'],
    goals_pool: [
      'book a business-class flight if within budget',
      'find a hotel near the city center with wifi',
      'skip experiences — this is a work trip',
      'skip car rental — will use taxis',
      'get it done quickly with minimal back-and-forth',
    ],
    constraints:
      'Efficiency-focused. Specific dates, no leisure, minimal questions.',
    personas_per_run: 2,
  },
  {
    archetype: 'edge_case',
    budget_range: null,
    travel_party: ['solo', 'romantic-partner', 'family-with-kids'],
    travelers_range: [1, 6],
    trip_type: ['round_trip', 'one_way'],
    communication_styles: ['terse', 'detailed', 'impatient'],
    goals_pool: [
      'plan a trip on a $200 budget',
      'travel to a destination with Level 4 advisory',
      'book a one-way trip with no return date',
      'plan a trip without setting a budget',
      'change destination mid-conversation',
      'ask off-topic questions mid-planning',
      'give dates in the past and see how agent handles it',
    ],
    constraints:
      'Stress-test edge cases. Unusual requests designed to find agent weaknesses.',
    personas_per_run: 3,
  },
];

export { DESTINATIONS, ORIGINS, TEMPLATES };
