import { AtprotoDid } from "@atcute/lexicons/syntax";
import { ReactiveMap } from "@solid-primitives/map";
import {
  backgroundColor,
  frameRate,
  showProfilePicture,
  showVisualizer,
  useDominantColorAsBg,
} from "./settings";
import { getSessionClient } from "./oauth";
import { is } from "@atcute/lexicons";
import { AppBskyActorProfile } from "@atcute/bluesky";
import { isBlob } from "@atcute/lexicons/interfaces";
import { render } from "./render";
import { FastAverageColor } from "fast-average-color";
import { toaster } from "~/components/Toaster";
import { parseColor } from "@ark-ui/solid";

export type TaskState = { file: File } & (
  | { status: "processing" }
  | { status: "error"; error: string }
  | { status: "success"; result: Blob }
);

let _idCounter = 0;
const generateId = () => _idCounter++;

const fac = new FastAverageColor();

export const tasks = new ReactiveMap<number, TaskState>();
export const addTask = async (
  did: AtprotoDid | undefined,
  file: File,
  duration?: number,
) => {
  const id = generateId();
  tasks.set(id, { status: "processing", file });
  try {
    let pfpUrl: string | undefined = undefined;
    console.log(did, showProfilePicture.get());
    if (did && (showProfilePicture.get() ?? true)) {
      const login = await getSessionClient(did);
      const profileResult = await login.client.get(
        "com.atproto.repo.getRecord",
        {
          params: {
            collection: "app.bsky.actor.profile",
            repo: did,
            rkey: "self",
          },
        },
      );
      if (!profileResult.ok)
        throw `failed to fetch profile: ${profileResult.data.error}`;
      if (!profileResult.data.value) throw `profile not found`;
      const profile = profileResult.data.value;
      if (!is(AppBskyActorProfile.mainSchema, profile))
        throw `invalid profile schema`;
      if (profile.avatar && !isBlob(profile.avatar))
        throw `invalid profile avatar`;
      pfpUrl = profile.avatar
        ? `${login.pds!}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${profile.avatar.ref.$link}`
        : undefined;
    }
    let bgColor = backgroundColor.get() ?? "#000000";
    if (pfpUrl && (useDominantColorAsBg.get() ?? true)) {
      try {
        const dom = await fac.getColorAsync(pfpUrl);
        const color = parseColor(dom.hex).toFormat("hsla");
        const [h, s, l] = color
          .getChannels()
          .map((chan) => color.getChannelValue(chan));
        bgColor = color.withChannelValue("lightness", l * 0.4).toString("hex");
      } catch (error) {
        console.error(error);
        toaster.create({
          title: "can't pick dominant color",
          description: `error: ${error}`,
          type: "error",
        });
      }
    }
    const result = await render(file, {
      pfpUrl,
      visualizer: showVisualizer.get() ?? true,
      frameRate: frameRate.get() ?? 30,
      bgColor,
      duration,
    });
    tasks.set(id, {
      file,
      status: "success",
      result,
    });
  } catch (error) {
    console.error(error);
    tasks.set(id, {
      file,
      status: "error",
      error: `failed to process audio: ${error}`,
    });
  }
};
