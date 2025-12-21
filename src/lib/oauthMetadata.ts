const env = import.meta.env;

export const redirectUri = env.VITE_OAUTH_REDIRECT_URL;
export const clientId = env.VITE_OAUTH_CLIENT_ID;
export const scope = env.VITE_OAUTH_SCOPE;
