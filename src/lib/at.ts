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
    agent,
    did: res.data.did,
    handle: res.data.handle,
    pds: didDoc.data.pds,
  };
};

export type UploadStatus = {
  stage: "auth" | "uploading" | "processing" | "posting" | "complete";
  progress?: number;
};

export const sendPost = async (
  did: AtprotoDid,
  blob: Blob,
  postContent: string,
  altText?: string,
  onStatus?: (status: UploadStatus) => void,
) => {
  const login = await getSessionClient(did);

  onStatus?.({ stage: "auth" });
  const serviceAuthUrl = new URL(
    `${login.pds}/xrpc/com.atproto.server.getServiceAuth`,
  );
  serviceAuthUrl.searchParams.append(
    "aud",
    login.pds!.replace("https://", "did:web:"),
  );
  serviceAuthUrl.searchParams.append("lxm", "com.atproto.repo.uploadBlob");
  serviceAuthUrl.searchParams.append(
    "exp",
    (Math.floor(Date.now() / 1000) + 60 * 30).toString(),
  ); // 30 minutes

  const serviceAuthResponse = await login.agent.handle(
    `${serviceAuthUrl.pathname}${serviceAuthUrl.search}`,
    {
      method: "GET",
    },
  );

  if (!serviceAuthResponse.ok) {
    const error = await serviceAuthResponse.text();
    throw `failed to get service auth: ${error}`;
  }

  const serviceAuth = await serviceAuthResponse.json();
  const token = serviceAuth.token;

  onStatus?.({ stage: "uploading" });
  const uploadUrl = new URL(
    "https://video.bsky.app/xrpc/app.bsky.video.uploadVideo",
  );
  uploadUrl.searchParams.append("did", did);
  uploadUrl.searchParams.append("name", "video.mp4");

  const uploadResponse = await fetch(uploadUrl.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "video/mp4",
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw `failed to upload video: ${error}`;
  }

  const jobStatus = await uploadResponse.json();
  let videoBlobRef = jobStatus.blob;

  onStatus?.({ stage: "processing" });
  while (!videoBlobRef) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const statusResponse = await fetch(
      `https://video.bsky.app/xrpc/app.bsky.video.getJobStatus?jobId=${jobStatus.jobId}`,
    );

    if (!statusResponse.ok) {
      const error = await statusResponse.json();
      // reuse blob
      if (error.error === "already_exists" && error.blob) {
        videoBlobRef = error.blob;
        break;
      }
      throw `failed to get job status: ${error.message || error.error}`;
    }

    const status = await statusResponse.json();
    if (status.jobStatus.blob) {
      videoBlobRef = status.jobStatus.blob;
    } else if (status.jobStatus.state === "JOB_STATE_FAILED") {
      throw `video processing failed: ${status.jobStatus.error || "unknown error"}`;
    } else if (status.jobStatus.progress !== undefined) {
      onStatus?.({
        stage: "processing",
        progress: status.jobStatus.progress,
      });
    }
  }

  onStatus?.({ stage: "posting" });
  const record: AppBskyFeedPost.Main = {
    $type: "app.bsky.feed.post",
    text: postContent,
    embed: {
      $type: "app.bsky.embed.video",
      video: videoBlobRef,
      alt: altText,
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

  onStatus?.({ stage: "complete" });
  return result.data;
};
