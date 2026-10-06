/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Browser-only persistence for the GitHub Pages build; omit for the Scala API. */
  readonly VITE_STORAGE_MODE?: 'browser';
  /** Optional local/public URL of the user's finished looping sky video. */
  readonly VITE_SKY_VIDEO?: string;
}
