// Client-safe library constants and types. No server-only imports here, so both
// server code and client components can pull from this module. The data-loading
// logic (which IS server-only) lives in library.ts.

export const LIBRARY_KINDS = ["prompt", "skill", "tool"] as const;
export type LibraryKind = (typeof LIBRARY_KINDS)[number];

/** Full record — handed to the client only when the viewer is entitled. */
export interface LibraryItem {
  id: string;
  kind: LibraryKind;
  slug: string | null;
  title: string;
  description: string;
  body: string | null;
  source_url: string | null;
  install_md: string | null;
  platform: string | null;
  category: string | null;
  specialty: string;
  tags: string[];
  is_published: boolean;
  sort_order: number;
  created_at: string;
}

/** Safe subset for the paywall preview — never carries paid content. */
export interface LibraryTeaser {
  id: string;
  kind: LibraryKind;
  title: string;
  description: string;
  category: string | null;
  tags: string[];
}

export interface LibraryData {
  userId: string | null;
  items: LibraryItem[];
  teasers: LibraryTeaser[];
  favorites: string[];
  notes: Record<string, string>;
  hasAccess: boolean;
  isAdmin: boolean;
  botUsername: string;
}
