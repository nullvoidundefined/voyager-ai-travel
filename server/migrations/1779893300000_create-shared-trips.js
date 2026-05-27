export const up = (pgm) => {
  pgm.createTable('shared_trips', {
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
    created_by: { type: 'uuid', notNull: true },
    expires_at: { type: 'timestamptz' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.createIndex('shared_trips', 'trip_id');
};

export const down = (pgm) => {
  pgm.dropTable('shared_trips');
};
