interface ImportMetaEnv {
  readonly VITE_CLIENT_URI: string;
  readonly VITE_OAUTH_CLIENT_ID: string;
  readonly VITE_OAUTH_REDIRECT_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
