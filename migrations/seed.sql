-- Optional starter data.
-- Your first admin account is created by calling POST /api/auth/register
-- once the Worker is deployed (see README) -- that automatically hashes the
-- password correctly, so it's simpler and safer than seeding a user here.
-- Run: npm run db:seed:local   (or db:seed:remote once you're ready to go live)

INSERT INTO Plan (id, name, price, durationMins, simultaneous, status)
VALUES ('seed-plan-1hr', '1 Hour Access', 500, 60, 1, 'ACTIVE');

INSERT INTO Plan (id, name, price, durationMins, simultaneous, status)
VALUES ('seed-plan-1day', '24 Hour Access', 1500, 1440, 1, 'ACTIVE');
