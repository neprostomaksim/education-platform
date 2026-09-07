"use client";

/** Remove legacy personal caches; preferences such as sidebar state can remain. */
export async function clearPrivateCache() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("lms-") && key !== "lms-sidebar-collapsed") localStorage.removeItem(key);
    }
  } catch { /* Storage may be disabled. Never trust it for authorization. */ }
  if ("caches" in window) {
    try {
      await Promise.all((await caches.keys()).filter(key => key.startsWith("lms-")).map(key => caches.delete(key)));
    } catch { /* Browser will retry cache cleanup when the worker activates. */ }
  }
}
