/** Map legacy public storage URLs to authenticated application endpoints. */
export function protectedImageSource(source: string): string {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) return source;
    const url = new URL(source);
    const prefix = "/storage/v1/object/public/lesson-images/";
    if (url.origin === new URL(base).origin && url.pathname.startsWith(prefix)) return `/api/lesson-images/${url.pathname.slice(prefix.length)}`;
  } catch { /* Relative image path. */ }
  return source;
}
export function lessonReferencesAsset(content: string, target: string): boolean {
  const matches = content.matchAll(/(?:\]\(|\bsrc=["'])([^\s)"']+)/g);
  for (const match of matches) {
    try {
      const source = protectedImageSource(match[1]);
      if (decodeURIComponent(source.split(/[?#]/)[0]) === target) return true;
    } catch { /* Invalid URL is never authorized. */ }
  }
  return false;
}
