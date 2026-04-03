export const up = (pgm) => {
  // Add JSONB preferences column
  pgm.addColumns('user_preferences', {
    preferences: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
  });

  // Backfill from existing columns
  pgm.sql(`
    UPDATE user_preferences SET preferences = jsonb_build_object(
      'version', 1,
      'accommodation', null,
      'travel_pace', CASE WHEN intensity IS NOT NULL THEN to_jsonb(intensity::text) ELSE 'null'::jsonb END,
      'dietary', COALESCE(to_jsonb(dietary), '[]'::jsonb),
      'dining_style', null,
      'activities', '[]'::jsonb,
      'travel_party', CASE
        WHEN social = 'couple' THEN '"romantic-partner"'::jsonb
        WHEN social = 'group' THEN '"friends"'::jsonb
        WHEN social = 'family' THEN '"family-with-kids"'::jsonb
        WHEN social = 'solo' THEN '"solo"'::jsonb
        ELSE 'null'::jsonb
      END,
      'budget_comfort', null,
      'completed_steps', '[]'::jsonb
    )
  `);

  // Drop old columns and enums
  pgm.dropColumns('user_preferences', ['dietary', 'intensity', 'social']);
  pgm.dropType('preference_intensity');
  pgm.dropType('preference_social');
};

export const down = (pgm) => {
  // Recreate enums
  pgm.createType('preference_intensity', ['relaxed', 'moderate', 'active']);
  pgm.createType('preference_social', ['solo', 'couple', 'group', 'family']);

  // Recreate columns
  pgm.addColumns('user_preferences', {
    dietary: {
      type: 'text[]',
      notNull: true,
      default: pgm.func('ARRAY[]::text[]'),
    },
    intensity: {
      type: 'preference_intensity',
      notNull: true,
      default: 'moderate',
    },
    social: { type: 'preference_social', notNull: true, default: 'couple' },
  });

  pgm.dropColumns('user_preferences', ['preferences']);
};
