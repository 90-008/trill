import {
  configureOAuth,
  defaultIdentityResolver,
  createAuthorizationUrl,
  finalizeAuthorization,
  OAuthUserAgent,
  getSession,
  deleteStoredSession,
} from "@atcute/oauth-browser-client";

import {
  CompositeDidDocumentResolver,
  PlcDidDocumentResolver,
  WebDidDocumentResolver,
} from "@atcute/identity-resolver";
import type { ActorIdentifier } from "@atcute/lexicons";
import type { AtprotoDid } from "@atcute/lexicons/syntax";
import { handleResolver, login } from "./at";
import { loggingIn } from "./accounts";
import { clientId, redirectUri, scope } from "./oauthMetadata";

const setupOAuth = () => {
  const metadata = {
    client_id: clientId,
    redirect_uri: redirectUri,
  };
  console.log(metadata);
  configureOAuth({
    metadata,
    identityResolver: defaultIdentityResolver({
      handleResolver,

      didDocumentResolver: new CompositeDidDocumentResolver({
        methods: {
          plc: new PlcDidDocumentResolver(),
          web: new WebDidDocumentResolver(),
        },
      }),
    }),
  });
};
setupOAuth();

export const sessions = {
  get: async (did: AtprotoDid) => {
    const session = await getSession(did, { allowStale: true });
    return new OAuthUserAgent(session);
  },
  remove: async (did: AtprotoDid) => {
    try {
      const agent = await sessions.get(did);
      await agent.signOut();
    } catch {
      deleteStoredSession(did);
    }
  },
};

export const flow = {
  start: async (identifier: ActorIdentifier): Promise<void> => {
    const authUrl = await createAuthorizationUrl({
      target: { type: "account", identifier },
      scope,
    });
    // recommended to wait for the browser to persist local storage before proceeding
    await new Promise((resolve) => setTimeout(resolve, 200));
    // redirect the user to sign in and authorize the app
    window.location.assign(authUrl);
    // if this is on an async function, ideally the function should never ever resolve.
    // the only way it should resolve at this point is if the user aborted the authorization
    // by returning back to this page (thanks to back-forward page caching)
    await new Promise((_resolve, reject) => {
      const listener = () => {
        reject(new Error(`user aborted the login request`));
      };
      window.addEventListener("pageshow", listener, { once: true });
    });
  },
  finalize: async (url: URL): Promise<OAuthUserAgent | null> => {
    // createAuthorizationUrl asks server to put the params in the hash
    const params = new URLSearchParams(url.hash.slice(1));
    if (!params.has("code")) return null;
    const { session } = await finalizeAuthorization(params);
    return new OAuthUserAgent(session);
  },
};

export const tryFinalizeLogin = async () => {
  const did = loggingIn.get();
  if (!did) return;

  const currentUrl = new URL(window.location.href);
  // scrub history so auth state cant be replayed
  try {
    history.replaceState(null, "", "/");
  } catch {
    // if router was unitialized then we probably dont need to scrub anyway
    // so its fine
  }

  loggingIn.set(undefined);
  await sessions.remove(did);
  const agent = await flow.finalize(currentUrl);
  if (!agent) throw "no session was logged into?";

  return await login(agent);
};

export const getSessionClient = async (did: AtprotoDid) => {
  const session = await sessions.get(did);
  if (!session) throw `no session found for ${did}`;
  return await login(session);
};
