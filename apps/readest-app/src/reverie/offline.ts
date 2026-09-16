// Reverie is fully offline: online Readest features are hidden, not deleted, so upstream merges stay easy.
// Set in .env.tauri (the desktop app). Tests don't load it, so Readest's own tests still see every feature.
// Each hidden entry point checks this flag; notes/plan.md lists them all.
export const isOfflineBuild = () => process.env['NEXT_PUBLIC_REVERIE_OFFLINE'] === 'true';
