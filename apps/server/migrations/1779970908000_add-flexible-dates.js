export const up = (pgm) => {
  pgm.addColumns('trips', {
    flexible_dates: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
  });
};

export const down = (pgm) => {
  pgm.dropColumns('trips', ['flexible_dates']);
};
