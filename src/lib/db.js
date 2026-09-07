// Thin helper around D1's prepared-statement API so route files read like
// simple function calls instead of repeating .prepare().bind().all() everywhere.

export async function all(db, sql, params = []) {
  const res = await db.prepare(sql).bind(...params).all();
  return res.results || [];
}

export async function first(db, sql, params = []) {
  return db.prepare(sql).bind(...params).first();
}

export async function run(db, sql, params = []) {
  return db.prepare(sql).bind(...params).run();
}

export function now() {
  return new Date().toISOString();
}

// Parses TEXT columns that store JSON back into objects. Returns `fallback`
// (default null) if the column was null/empty/unparseable.
export function parseJson(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function toJson(value) {
  return value === undefined ? null : JSON.stringify(value);
}
