/* @refresh reload */
import { render } from "solid-js/web";
import "solid-devtools";
import "./index.css";

import type {} from "@atcute/atproto";
import type {} from "@atcute/bluesky";
import type {} from "@atcute/microcosm";

import App from "./App";
import { tryFinalizeLogin } from "./lib/oauth";
import { accounts, setAccounts } from "./lib/accounts";
import { AtprotoDid } from "@atcute/lexicons/syntax";
import { toaster } from "./components/Toaster";
import { autoTranscribe } from "./lib/settings";
import { preloadModel } from "./lib/transcribe";
import { Text } from "~/components/ui/text";
import { Link } from "~/components/ui/link";
import { HStack } from "styled-system/jsx";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
  );
}

const prefersDarkScheme = window.matchMedia(
  "(prefers-color-scheme: dark)",
).matches;
document.documentElement.dataset.theme = prefersDarkScheme ? "dark" : "light";

tryFinalizeLogin()
  .then((login) => {
    if (!login) return;
    let currentAccounts = accounts();
    currentAccounts = currentAccounts.filter((acc) => acc.did !== login.did);
    setAccounts([
      ...currentAccounts,
      {
        did: login.did as AtprotoDid,
        handle: login.handle === "handle.invalid" ? undefined : login.handle,
      },
    ]);
    toaster.create({
      title: "login success",
      description: `logged in as ${login.handle}`,
      type: "success",
    });
  })
  .catch((error) => {
    console.error(error);
    toaster.create({
      title: "login error",
      description: `${error}`,
      type: "error",
    });
  });

if (autoTranscribe.get()) preloadModel();

render(() => <App />, root!);
