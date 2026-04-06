import { z } from 'zod';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

// SEC-03 (2026-04-06 audit): allowlist for location-like fields.
// Accepts unicode letters / numbers / spaces and the punctuation
// legitimately used in place names (comma, period, hyphen,
// apostrophe, parentheses). Rejects shell metachars, HTML / XSS
// characters, URL-structure characters (?, #, /, =), control
// characters, and anything longer than 100 chars. Length cap is
// conservative: the longest real city name ("Krung Thep Maha
// Nakhon..." 168 chars) does not fit, but the world does not need
// Voyager to book trips to Bangkok's full ceremonial name.
const locationAllowlist = z
  .string()
  .min(1)
  .max(100)
  .regex(
    /^[\p{L}\p{N} ,.\-'()]+$/u,
    'Must contain only letters, numbers, spaces, and common punctuation',
  );

export const searchFlightsSchema = z.object({
  origin: locationAllowlist,
  destination: locationAllowlist,
  departure_date: dateString,
  return_date: dateString.optional(),
  passengers: z.number().int().min(1),
  max_price: z.number().positive().optional(),
  cabin_class: z
    .enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'])
    .optional(),
  one_way: z.boolean().optional(),
});

export const searchHotelsSchema = z.object({
  city: locationAllowlist,
  check_in: dateString,
  check_out: dateString,
  guests: z.number().int().min(1),
  star_rating_min: z.number().min(1).max(5).optional(),
  max_price_per_night: z.number().positive().optional(),
});

export const searchExperiencesSchema = z.object({
  location: locationAllowlist,
  categories: z.array(z.string().min(1).max(50)).min(1),
  max_price_per_person: z.number().positive().optional(),
  limit: z.number().int().positive().optional(),
});

export const calculateBudgetSchema = z.object({
  total_budget: z.number(),
  flight_cost: z.number(),
  hotel_total_cost: z.number(),
  experience_costs: z.array(z.number()),
});

export const getDestinationInfoSchema = z.object({
  city_name: locationAllowlist,
});

export const updateTripSchema = z.object({
  destination: locationAllowlist.optional(),
  origin: locationAllowlist.optional(),
  departure_date: dateString.optional(),
  return_date: dateString.optional(),
  budget_total: z.number().positive().optional(),
  transport_mode: z.enum(['flying', 'driving']).optional(),
});

export const searchCarRentalsSchema = z.object({
  pickup_location: locationAllowlist,
  pickup_date: dateString,
  dropoff_date: dateString,
  dropoff_location: locationAllowlist.optional(),
  car_type: z.string().max(50).optional(),
});

export const selectFlightSchema = z.object({
  airline: z.string().min(1),
  flight_number: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  departure_time: z.string().optional(),
  arrival_time: z.string().optional(),
  price: z.number(),
  currency: z.string().min(1),
});

export const selectHotelSchema = z.object({
  name: z.string().min(1),
  city: z.string().optional(),
  star_rating: z.number().optional(),
  price_per_night: z.number(),
  total_price: z.number(),
  currency: z.string().min(1),
  check_in: z.string().optional(),
  check_out: z.string().optional(),
});

export const selectCarRentalSchema = z.object({
  provider: z.string().min(1),
  car_name: z.string().min(1),
  car_type: z.string().optional(),
  price_per_day: z.number().optional(),
  total_price: z.number(),
  currency: z.string().min(1),
});

export const selectExperienceSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  estimated_cost: z.number(),
  rating: z.number().optional(),
});

export const formatResponseSchema = z.object({
  text: z.string().min(1),
  citations: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        url: z.string().optional(),
        source_type: z.string().optional(),
      }),
    )
    .optional(),
  quick_replies: z.array(z.string()).optional(),
  advisory: z
    .object({
      severity: z.enum(['info', 'warning', 'critical']),
      title: z.string(),
      body: z.string(),
    })
    .optional(),
  skip_category: z
    .enum(['flights', 'hotels', 'car_rental', 'experiences'])
    .optional(),
});

export const toolSchemas: Record<string, z.ZodSchema> = {
  search_flights: searchFlightsSchema,
  search_hotels: searchHotelsSchema,
  search_experiences: searchExperiencesSchema,
  calculate_remaining_budget: calculateBudgetSchema,
  get_destination_info: getDestinationInfoSchema,
  update_trip: updateTripSchema,
  search_car_rentals: searchCarRentalsSchema,
  select_flight: selectFlightSchema,
  select_hotel: selectHotelSchema,
  select_car_rental: selectCarRentalSchema,
  select_experience: selectExperienceSchema,
  format_response: formatResponseSchema,
};
