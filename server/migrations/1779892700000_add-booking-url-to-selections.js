export const up = (pgm) => {
  pgm.addColumns('trip_flights', { booking_url: { type: 'text' } });
  pgm.addColumns('trip_hotels', { booking_url: { type: 'text' } });
  pgm.addColumns('trip_car_rentals', { booking_url: { type: 'text' } });
  pgm.addColumns('trip_experiences', { booking_url: { type: 'text' } });
};

export const down = (pgm) => {
  pgm.dropColumns('trip_flights', ['booking_url']);
  pgm.dropColumns('trip_hotels', ['booking_url']);
  pgm.dropColumns('trip_car_rentals', ['booking_url']);
  pgm.dropColumns('trip_experiences', ['booking_url']);
};
