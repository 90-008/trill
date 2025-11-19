import { createSignal, onCleanup } from "solid-js";
import { MicIcon } from "lucide-solid";
import { IconButton } from "./ui/icon-button";
import { Popover } from "./ui/popover";
import { AtprotoDid } from "@atcute/lexicons/syntax";
import { addTask } from "../lib/task";
import { toaster } from "./Toaster";
import { createTimeDifferenceFromNow } from "@solid-primitives/date";

type MicRecorderProps = {
  selectedAccount: () => AtprotoDid | undefined;
};

const MicRecorder = (props: MicRecorderProps) => {
  const [isRecording, setIsRecording] = createSignal(false);
  const [recordingStart, setRecordingStart] = createSignal(0);
  const [diff] = createTimeDifferenceFromNow(recordingStart, () =>
    isRecording() ? 1000 : 0,
  );

  let mediaRecorder: MediaRecorder | null = null;
  let mediaStream: MediaStream | null = null;
  let audioChunks: Blob[] = [];

  const preferredMimeType = "audio/webm;codecs=opus";
  const fallbackMimeType = "audio/webm";

  const startRecording = async () => {
    try {
      audioChunks = [];

      if (!window.MediaRecorder) {
        toaster.create({
          title: "recording not supported",
          description: "your browser does not support the MediaRecorder API.",
          type: "error",
        });
        return;
      }

      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: { ideal: true },
          noiseSuppression: { ideal: true },
          echoCancellation: { ideal: true },
        },
      });
      const audioTrack = mediaStream.getAudioTracks()[0] ?? null;
      if (!audioTrack) throw "no audio track found";

      let mimeType = "";
      if (MediaRecorder.isTypeSupported(preferredMimeType)) {
        mimeType = preferredMimeType;
      } else if (MediaRecorder.isTypeSupported(fallbackMimeType)) {
        console.warn(`falling back to ${fallbackMimeType} for recording audio`);
        mimeType = fallbackMimeType;
      } else {
        console.warn(
          `browser does not support preffered audio / container type.
          falling back to whatever the browser picks`,
        );
        mimeType = "";
      }

      const options: MediaRecorderOptions = {
        audioBitsPerSecond: 128000,
        bitsPerSecond: 128000,
      };
      if (mimeType) options.mimeType = mimeType;

      mediaRecorder = new MediaRecorder(mediaStream, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        mediaStream?.getTracks().forEach((track) => track.stop());
        mediaStream = null;

        if (audioChunks.length === 0) {
          toaster.create({
            title: "recording error",
            description: "recording is empty.",
            type: "error",
          });
          return;
        }

        const usedMime =
          mediaRecorder?.mimeType || mimeType || fallbackMimeType;
        const fileExtension = usedMime.split("/")[1]?.split(";")[0] || "webm";
        const blob = new Blob(audioChunks, { type: usedMime });
        const fileDate = new Date()
          .toLocaleTimeString()
          .replace(/:/g, "-")
          .replace(/\s+/g, "_");
        const file = new File([blob], `rec-${fileDate}.${fileExtension}`, {
          type: usedMime,
        });

        console.info(usedMime, file.size);

        addTask(props.selectedAccount(), file);
        audioChunks = [];
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        toaster.create({
          title: "recording error",
          description: `an error occurred: ${event.error.message}`,
          type: "error",
        });
        stopRecording();
      };

      mediaRecorder.start();

      setIsRecording(true);
      setRecordingStart(Date.now());
    } catch (error) {
      console.error("error accessing microphone:", error);
      toaster.create({
        title: "error starting recording",
        description: `could not start recording: ${error}`,
        type: "error",
      });

      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
      }
    }
  };

  const stopRecording = () => {
    if (!isRecording() || !mediaRecorder) return;
    if (mediaRecorder.state !== "inactive") mediaRecorder.stop();
    setIsRecording(false);
  };

  onCleanup(() => {
    stopRecording();
    mediaStream?.getTracks().forEach((track) => track.stop());
  });

  const formatTime = (timeDiff: () => number) => {
    const seconds = Math.round(Math.abs(timeDiff()) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Popover.Root positioning={{ placement: "top" }} open={isRecording()}>
      <Popover.Anchor
        asChild={(anchorProps) => (
          <IconButton
            {...anchorProps()}
            size="md"
            variant={isRecording() ? "solid" : "subtle"}
            colorPalette={isRecording() ? "red" : undefined}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
          >
            <MicIcon />
          </IconButton>
        )}
      />
      <Popover.Positioner>
        <Popover.Content fontFamily="monospace">
          {formatTime(diff)}
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
};

export default MicRecorder;
