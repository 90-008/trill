import { createSignal, onCleanup, Show } from "solid-js";
import { CircleStopIcon, MicIcon } from "lucide-solid";
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

  // Flag to handle case where user releases hold before recording actually starts
  let stopRequestPending = false;

  const isSafari =
    typeof navigator !== "undefined" &&
    navigator.vendor &&
    navigator.vendor.indexOf("Apple") > -1;

  // const preferredMimeType = isSafari
  //   ? 'audio/mp4; codecs="mp4a.40.2"'
  //   : "audio/webm;codecs=opus";
  // const fallbackMimeType = isSafari ? "audio/mp4" : "audio/webm";
  const preferredMimeType = "audio/webm; codecs=opus";
  const fallbackMimeType = "audio/webm";

  const startRecording = async () => {
    if (isRecording()) return;
    stopRequestPending = false;

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

      // check if holding stopped while waiting for permission/stream
      if (stopRequestPending) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
        return;
      }

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

      // delayed hold release
      if (stopRequestPending) stopRecording();
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
    if (!isRecording() || !mediaRecorder) {
      stopRequestPending = true;
      return;
    }
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

  let pressStartTime = 0;
  let startedSession = false;

  const handlePointerDown = (e: PointerEvent) => {
    if (isRecording()) {
      stopRecording();
      startedSession = false;
    } else {
      startRecording();
      pressStartTime = Date.now();
      startedSession = true;
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (startedSession) {
      const duration = Date.now() - pressStartTime;
      if (duration >= 500) stopRecording();

      startedSession = false;
    }
  };

  const handlePointerLeave = (e: PointerEvent) => {
    if (startedSession && isRecording()) {
      stopRecording();
      startedSession = false;
    }
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
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onContextMenu={(e) => e.preventDefault()}
          >
            {isRecording() ? <CircleStopIcon /> : <MicIcon />}
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
