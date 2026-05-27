export const up = (pgm) => {
  pgm.createTable('trip_schedule', {
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
    day_date: { type: 'date', notNull: true },
    day_number: { type: 'integer', notNull: true },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.addConstraint('trip_schedule', 'trip_schedule_unique_day', {
    unique: ['trip_id', 'day_number'],
  });
  pgm.createIndex('trip_schedule', 'trip_id');

  pgm.createTable('trip_schedule_items', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    schedule_id: {
      type: 'uuid',
      notNull: true,
      references: '"trip_schedule"',
      onDelete: 'CASCADE',
    },
    time_of_day: { type: 'varchar(10)', notNull: true },
    title: { type: 'varchar(200)', notNull: true },
    description: { type: 'text' },
    item_type: { type: 'varchar(20)', notNull: true },
    item_order: { type: 'integer', notNull: true },
    place_id: { type: 'varchar(100)' },
    booking_url: { type: 'text' },
    price_usd: { type: 'numeric(10,2)' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.createIndex('trip_schedule_items', 'schedule_id');
};

export const down = (pgm) => {
  pgm.dropTable('trip_schedule_items');
  pgm.dropTable('trip_schedule');
};
