/**
 * ENG-03 (2026-04-06 audit): remove dead Amadeus references.
 *
 * Voyager was originally scoped to use the Amadeus API for flights and
 * hotels. The implementation pivoted to SerpApi early on, but the
 * schema still carried `amadeus_offer_id` on trip_flights,
 * `amadeus_hotel_id` on trip_hotels, and the `api_provider` enum
 * included 'amadeus' as a value. No code ever wrote to any of these
 * fields, and no Amadeus client exists in server/src/. This migration
 * removes the dead schema surface.
 *
 * The `api_provider` enum also gains 'serpapi' as the actual provider
 * name used by the cache code today.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.dropColumns('trip_flights', ['amadeus_offer_id']);
  pgm.dropColumns('trip_hotels', ['amadeus_hotel_id']);

  // Rename the enum type out of the way, create a new one without
  // 'amadeus' and with 'serpapi' added, alter the column to use the
  // new type, then drop the old. This is the idiomatic node-pg-migrate
  // way to remove an enum value in Postgres.
  pgm.renameType('api_provider', 'api_provider_old');
  pgm.createType('api_provider', ['serpapi', 'google_places']);
  pgm.alterColumn('api_cache', 'provider', {
    type: 'api_provider',
    using: 'provider::text::api_provider',
  });
  pgm.dropType('api_provider_old');
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export const down = (pgm) => {
  // Restore the old enum with amadeus included.
  pgm.renameType('api_provider', 'api_provider_new');
  pgm.createType('api_provider', ['amadeus', 'google_places']);
  pgm.alterColumn('api_cache', 'provider', {
    type: 'api_provider',
    using: 'provider::text::api_provider',
  });
  pgm.dropType('api_provider_new');

  // Restore the dead columns as nullable so old data round-trips.
  pgm.addColumns('trip_flights', {
    amadeus_offer_id: { type: 'text' },
  });
  pgm.addColumns('trip_hotels', {
    amadeus_hotel_id: { type: 'text' },
  });
};
