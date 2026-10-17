// Extract a human-readable error message from a thrown value.
//
// Supabase-js v2 returns errors from `supabase.rpc()` and similar as plain
// objects (not Error instances). They have the shape:
//   { message: string, code: string, details: string|null, hint: string|null }
//
// The previous UI code did `e instanceof Error ? e.message : "Search failed."`
// which ALWAYS returned the fallback because the Supabase error is not an
// Error instance. This swallowed the real error message.
//
// This helper extracts the actual message from any thrown value shape:
//   * Error instances (use .message)
//   * Supabase PostgrestError-like objects (use .message)
//   * Plain strings (use as-is)
//   * Anything else (fallback to the provided default)

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === "string") return error || fallback;
  if (error instanceof Error) return error.message || fallback;
  // Supabase / PostgrestError shape
  const anyErr = error as { message?: unknown; error?: { message?: unknown } };
  const directMessage = typeof anyErr.message === "string" ? anyErr.message : null;
  if (directMessage && directMessage.trim()) return directMessage;
  const nestedMessage = typeof anyErr.error?.message === "string" ? anyErr.error.message : null;
  if (nestedMessage && nestedMessage.trim()) return nestedMessage;
  return fallback;
}
