export const up = (pgm) => {
  pgm.addColumn('trips', {
    trip_structure: {
      type: 'varchar(20)',
      notNull: true,
      default: 'single',
    },
  });
  pgm.addConstraint('trips', 'trips_trip_structure_check', {
    check: "trip_structure IN ('single', 'multi_city')",
  });

  pgm.createTable('trip_legs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    trip_id: {
      type: 'uuid',
      notNull: true,
      references: '"trips"',
      onDelete: 'CASCADE',
    },
    origin: { type: 'varchar(100)', notNull: true },
    destination: { type: 'varchar(100)', notNull: true },
    depart_date: { type: 'date', notNull: true },
    leg_order: { type: 'integer', notNull: true },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.createIndex('trip_legs', 'trip_id');

  pgm.createTable('trip_transport', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    leg_id: {
      type: 'uuid',
      notNull: true,
      references: '"trip_legs"',
      onDelete: 'CASCADE',
    },
    type: { type: 'varchar(20)', notNull: true },
    provider: { type: 'varchar(100)' },
    departure_time: { type: 'timestamptz' },
    arrival_time: { type: 'timestamptz' },
    price_usd: { type: 'numeric(10,2)' },
    booking_url: { type: 'text' },
    raw_data: { type: 'jsonb' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.createIndex('trip_transport', 'leg_id');
};

export const down = (pgm) => {
  pgm.dropTable('trip_transport');
  pgm.dropTable('trip_legs');
  pgm.dropConstraint('trips', 'trips_trip_structure_check');
  pgm.dropColumn('trips', 'trip_structure');
};
