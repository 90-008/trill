import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import devtools from "solid-devtools/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import oauthMetadata from "./src/lib/oauthMetadata.json";

export const makeOauthMetadata = (
  client_id: string,
  client_uri: string,
  redirect_uri: string,
) => ({
  ...oauthMetadata,
  client_id,
  client_uri,
  logo_uri: `${client_uri}/favicon.png`,
  redirect_uris: [redirect_uri],
});

export default defineConfig({
  plugins: [
    {
      name: "oauth-metadata",
      config(_conf, { command }) {
        if (command !== "build") {
          process.env.VITE_CLIENT_URI = "http://localhost:3000";
          const redirectUri = "http://127.0.0.1:3000";
          process.env.VITE_OAUTH_REDIRECT_URL = redirectUri;
          process.env.VITE_OAUTH_CLIENT_ID =
            `http://localhost` +
            `?redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&scope=${encodeURIComponent(oauthMetadata.scope)}`;
        }
      },
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.headers.host?.startsWith("127.0.0.1")) {
            const newUrl = `http://localhost:${req.headers.host.split(":")[1] || "3000"}${req.url}`;
            res.writeHead(301, { Location: newUrl });
            res.end();
            return;
          }
          next();
        });
        server.middlewares.use((req, res, next) => {
          if (req.url === "/oauth-client-metadata.json") {
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify(
                makeOauthMetadata(
                  process.env.VITE_OAUTH_CLIENT_ID!,
                  process.env.VITE_CLIENT_URI!,
                  process.env.VITE_OAUTH_REDIRECT_URL!,
                ),
                null,
                2,
              ),
            );
            return;
          }
          next();
        });
      },
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "oauth-client-metadata.json",
          source: JSON.stringify(
            makeOauthMetadata(
              process.env.VITE_OAUTH_CLIENT_ID!,
              process.env.VITE_CLIENT_URI!,
              process.env.VITE_OAUTH_REDIRECT_URL!,
            ),
            null,
            2,
          ),
        });
      },
    },
    devtools(),
    solidPlugin(),
    tsconfigPaths({ root: "./" }),
  ],
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  build: {
    target: "esnext",
  },
});
