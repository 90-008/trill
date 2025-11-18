import { XrpcHandleResolver } from "@atcute/identity-resolver";
import { OAuthUserAgent } from "@atcute/oauth-browser-client";
import { Client as AtcuteClient, simpleFetchHandler } from "@atcute/client";
import { getSessionClient } from "./oauth";
import { AppBskyFeedPost } from "@atcute/bluesky";
import { AtprotoDid } from "@atcute/lexicons/syntax";

export const slingshotUrl = "https://slingshot.microcosm.blue";

export const handleResolver = new XrpcHandleResolver({
  serviceUrl: slingshotUrl,
});
export const slingshot = new AtcuteClient({
  handler: simpleFetchHandler({ service: slingshotUrl }),
});

export const login = async (agent: OAuthUserAgent) => {
  const rpc = new AtcuteClient({ handler: agent });
  const res = await rpc.get("com.atproto.server.getSession", { params: {} });
  if (!res.ok) throw res.data.error;
  const didDoc = await slingshot.get(
    "com.bad-example.identity.resolveMiniDoc",
    { params: { identifier: res.data.did } },
  );
  if (!didDoc.ok) throw didDoc.data.error;
  return {
    client: rpc,
    did: res.data.did,
    handle: res.data.handle,
    pds: didDoc.data.pds,
  };
};

export const sendPost = async (
  did: AtprotoDid,
  blob: Blob,
  postContent: string,
) => {
  const login = await getSessionClient(did);
  const upload = await login.client.post("com.atproto.repo.uploadBlob", {
    input: blob,
  });
  if (!upload.ok) throw `failed to upload blob: ${upload.data.error}`;
  const record: AppBskyFeedPost.Main = {
    $type: "app.bsky.feed.post",
    text: postContent,
    embed: {
      $type: "app.bsky.embed.video",
      video: upload.data.blob,
    },
    createdAt: new Date().toISOString(),
  };
  const result = await login.client.post("com.atproto.repo.createRecord", {
    input: {
      collection: "app.bsky.feed.post",
      record,
      repo: did,
    },
  });
  if (!result.ok) throw `failed to upload post: ${result.data.error}`;
  return result.data;
};
