interface PgErrorLike {
  code?: string;
  constraint?: string;
  constraint_name?: string;
  cause?: unknown;
}

export interface PgDupError {
  code: "23505";
  constraint: string | null;
}

/**
 * Drizzle 0.45 wraps every driver error in DrizzleQueryError (query, params,
 * cause): the pg error rides on `.cause`, and postgres.js names the violating
 * index `constraint_name` (not `constraint`). Normalizes both shapes and both
 * spellings; null when this is anything but a unique violation (23505).
 */
export function pgDupError(e: unknown): PgDupError | null {
  const direct = e as PgErrorLike | undefined;
  const cause = direct?.cause as PgErrorLike | undefined;
  const src =
    direct?.code === "23505" ? direct : cause?.code === "23505" ? cause : undefined;
  if (!src) return null;
  return { code: "23505", constraint: src.constraint_name ?? src.constraint ?? null };
}
