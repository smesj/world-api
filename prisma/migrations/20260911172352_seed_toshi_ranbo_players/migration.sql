-- Seed the initial Toshi Ranbo player roster.
-- ON CONFLICT DO NOTHING makes this idempotent against the unique "name"
-- constraint, so re-running it by hand (outside Prisma's own
-- once-per-migration tracking) can never double these rows up.
INSERT INTO "ToshiRanboPlayer" ("name") VALUES
  ('Smesj'),
  ('Cam'),
  ('Moose'),
  ('Alan'),
  ('Babin'),
  ('Ted'),
  ('Ginny')
ON CONFLICT ("name") DO NOTHING;
