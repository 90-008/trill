import {
  AutomaticSpeechRecognitionPipeline,
  pipeline,
} from "@huggingface/transformers";
import { toaster } from "~/components/Toaster";
import { defaultWhisperModel, whisperModel } from "./settings";

let transcriberPromise: Promise<AutomaticSpeechRecognitionPipeline> | null =
  null;
let model: AutomaticSpeechRecognitionPipeline | null = null;

const loadModel = () => {
  if (model) return Promise.resolve(model);

  if (transcriberPromise) return transcriberPromise;

  let toastId: string | undefined;

  const modelName = whisperModel.get() ?? defaultWhisperModel;

  transcriberPromise = pipeline("automatic-speech-recognition", modelName, {
    progress_callback: (data: any) => {
      // data contains: { status, file, name, loaded, total, progress }
      if (data.status === "initiate") {
        if (!toastId) {
          toastId = toaster.create({
            title: "downloading transcription model",
            description: `fetching ${data.file}...`,
            type: "info",
            duration: 999999,
          });
        }
      } else if (data.status === "progress" && toastId) {
        const percent = data.progress ? Math.round(data.progress) : 0;
        toaster.update(toastId, {
          title: "downloading transcription model",
          description: `fetching ${data.file} (at ${percent}%)...`,
          type: "info",
          duration: 999999,
        });
      }
    },
  })
    .then((transcriber) => {
      if (toastId) {
        toaster.update(toastId, {
          title: "transcription model loaded",
          description: `${modelName.split("/")[1]} is ready`,
          type: "success",
          duration: 3000,
        });
      }
      model = transcriber;
      return transcriber;
    })
    .catch((err) => {
      const toastOpts = {
        title: "transcription model download failed",
        description: `${err}`,
        type: "error",
        duration: 5000,
      };
      if (toastId) toaster.update(toastId, toastOpts);
      else toaster.create(toastOpts);

      model = null;

      throw err;
    })
    .finally(() => {
      transcriberPromise = null;
    });

  return transcriberPromise;
};

export const preloadModel = () => {
  model = null;
  loadModel().catch((e) => console.error("preload failed", e));
};

export const transcribe = async (file: File): Promise<string> => {
  const url = URL.createObjectURL(file);
  try {
    await loadModel();
    if (!model) throw "model not loaded";

    const output = await model(url);
    return [output].flat()[0].text.trim();
  } catch (err) {
    console.error("transcription failed", err);
    toaster.create({
      title: "transcription failed",
      description: `${err}`,
      type: "error",
    });
    throw err;
  } finally {
    URL.revokeObjectURL(url);
  }
};
