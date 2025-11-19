import {
  Output as MediaOutput,
  Mp4OutputFormat,
  BufferTarget,
  CanvasSource,
  QUALITY_MEDIUM,
  getFirstEncodableVideoCodec,
  Input as MediaInput,
  BlobSource,
  ALL_FORMATS,
  Conversion,
} from "mediabunny";

const renderCanvas = new OffscreenCanvas(1280, 720);

// claude generated visualizer code cuz im lazy and it works okay ig

/**
 * Extracts frequency data from audio file for visualization
 * Efficient FFT-like approach with adaptive sensitivity based on track volume
 */
const extractFrequencyData = async (file: File, fps: number = 30) => {
  if (fps <= 0)
    throw new Error("invalid frame rate: must be greater than zero");

  const audioContext = new AudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const fftSize = 2048;
  const frequencyBinCount = fftSize / 2;
  const hopSize = Math.floor(sampleRate / fps);
  const totalFrames = Math.floor(channelData.length / hopSize);

  // Pre-calculate volume levels for adaptive scaling
  const volumeWindowSize = Math.floor(sampleRate * 2); // 2 second windows
  const volumeLevels: number[] = [];

  for (let i = 0; i < channelData.length; i += volumeWindowSize) {
    let sum = 0;
    const end = Math.min(i + volumeWindowSize, channelData.length);
    for (let j = i; j < end; j++) {
      sum += Math.abs(channelData[j]);
    }
    volumeLevels.push(sum / (end - i));
  }

  // Calculate overall average and max volume for normalization
  const avgVolume =
    volumeLevels.reduce((a, b) => a + b, 0) / volumeLevels.length;
  const maxVolume = Math.max(...volumeLevels);

  const allFrequencyData: Uint8Array[] = [];
  let previousFrame: Float32Array | null = null;
  const smoothingFactor = 0.45;

  // Pre-compute sine/cosine tables for efficiency
  const numBands = 128;
  const cosTable: number[][] = [];
  const sinTable: number[][] = [];

  for (let i = 0; i < numBands; i++) {
    cosTable[i] = [];
    sinTable[i] = [];
    const freqIndex = Math.pow(i / numBands, 1.5) * frequencyBinCount;

    for (let j = 0; j < fftSize; j++) {
      const angle = (2 * Math.PI * freqIndex * j) / fftSize;
      cosTable[i][j] = Math.cos(angle);
      sinTable[i][j] = Math.sin(angle);
    }
  }

  for (let frame = 0; frame < totalFrames; frame++) {
    const offset = frame * hopSize;

    // Determine which volume window this frame is in
    const volumeIndex = Math.floor(offset / volumeWindowSize);
    const currentVolume =
      volumeLevels[Math.min(volumeIndex, volumeLevels.length - 1)];

    // Calculate adaptive boost: quieter sections get more boost
    // Range from 1.5x to 8x boost depending on how quiet the section is
    const volumeRatio = currentVolume / (avgVolume + 0.0001);
    const adaptiveBoost = Math.pow(1 / (volumeRatio + 0.3), 0.6) * 4;

    const slice = new Float32Array(fftSize);

    // Apply Hann window
    for (let i = 0; i < fftSize; i++) {
      const idx = offset + i;
      const sample = idx < channelData.length ? channelData[idx] : 0;
      const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / fftSize));
      slice[i] = sample * window;
    }

    // Calculate magnitudes for reduced frequency bands
    const frequencyData = new Float32Array(numBands);

    for (let i = 0; i < numBands; i++) {
      let real = 0;
      let imag = 0;

      for (let j = 0; j < fftSize; j += 4) {
        real += slice[j] * cosTable[i][j];
        imag += slice[j] * sinTable[i][j];
      }

      const magnitude = Math.sqrt(real * real + imag * imag);

      // Apply logarithmic scaling with adaptive boost
      const boosted = Math.log(magnitude * 30 * adaptiveBoost + 1) * 20;
      frequencyData[i] = boosted;
    }

    // Temporal smoothing
    if (previousFrame) {
      for (let i = 0; i < numBands; i++) {
        frequencyData[i] =
          smoothingFactor * previousFrame[i] +
          (1 - smoothingFactor) * frequencyData[i];
      }
    }

    // Spatial smoothing
    const smoothed = new Float32Array(numBands);
    for (let i = 0; i < numBands; i++) {
      const prev = i > 0 ? frequencyData[i - 1] : frequencyData[i];
      const next = i < numBands - 1 ? frequencyData[i + 1] : frequencyData[i];
      smoothed[i] = (prev + frequencyData[i] * 2 + next) / 4;
    }

    // Expand back to full frequencyBinCount for circular visualization
    const uint8Data = new Uint8Array(frequencyBinCount);
    for (let i = 0; i < frequencyBinCount; i++) {
      const bandIndex = (i / frequencyBinCount) * numBands;
      const lower = Math.floor(bandIndex);
      const upper = Math.min(numBands - 1, Math.ceil(bandIndex));
      const t = bandIndex - lower;

      const value = smoothed[lower] * (1 - t) + smoothed[upper] * t;
      uint8Data[i] = Math.min(255, Math.max(0, Math.floor(value)));
    }

    allFrequencyData.push(uint8Data);
    previousFrame = smoothed;
  }

  return allFrequencyData;
};

const drawPfp = (
  ctx: OffscreenCanvasRenderingContext2D,
  pfpImg: HTMLImageElement,
  centerX: number,
  centerY: number,
  baseRadius: number,
) => {
  const pfpSize = baseRadius * 1.9;
  const pfpX = centerX - pfpSize / 2;
  const pfpY = centerY - pfpSize / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, pfpSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(pfpImg, pfpX, pfpY, pfpSize, pfpSize);
  ctx.restore();
};

/**
 * Draws circular audio visualizer around center
 * Inspired by circular spectrum visualizers: https://codepen.io/nfj525/pen/rVBaab
 */
const drawCircularVisualizer = (
  ctx: OffscreenCanvasRenderingContext2D,
  canvas: OffscreenCanvas,
  frequencyData: Uint8Array,
  pfpImg: HTMLImageElement | null,
) => {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const baseRadius = Math.min(canvas.width, canvas.height) * 0.15;
  const maxBarHeight = baseRadius * 1.5;

  // Draw profile picture in center if provided
  if (pfpImg) drawPfp(ctx, pfpImg, centerX, centerY, baseRadius);

  // Draw circular bars
  const barCount = 128;
  const angleStep = (Math.PI * 2) / barCount;

  for (let i = 0; i < barCount; i++) {
    const dataIndex = Math.floor((i / barCount) * frequencyData.length);
    const value = frequencyData[dataIndex] / 255;
    const barHeight = value * maxBarHeight;

    const angle = i * angleStep - Math.PI / 2;
    const innerX = centerX + Math.cos(angle) * baseRadius;
    const innerY = centerY + Math.sin(angle) * baseRadius;
    const outerX = centerX + Math.cos(angle) * (baseRadius + barHeight);
    const outerY = centerY + Math.sin(angle) * (baseRadius + barHeight);

    const hue = (i / barCount) * 360;
    const brightness = 50 + value * 50;
    ctx.strokeStyle = `hsl(${hue}, 100%, ${brightness}%)`;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.lineTo(outerX, outerY);
    ctx.stroke();
  }
};

/**
 * Draws flat horizontal audio visualizer bars
 */
const drawFlatVisualizer = (
  ctx: OffscreenCanvasRenderingContext2D,
  canvas: OffscreenCanvas,
  frequencyData: Uint8Array,
) => {
  const barCount = 64;
  const barWidth = canvas.width / barCount;
  const maxBarHeight = canvas.height * 0.8;
  const baseY = canvas.height / 2;

  for (let i = 0; i < barCount; i++) {
    const dataIndex = Math.floor((i / barCount) * frequencyData.length);
    const value = frequencyData[dataIndex] / 255;
    const barHeight = (value * maxBarHeight) / 2;

    const hue = (i / barCount) * 360;
    const brightness = 50 + value * 50;
    ctx.fillStyle = `hsl(${hue}, 100%, ${brightness}%)`;

    // Draw mirrored bars (top and bottom)
    ctx.fillRect(i * barWidth, baseY - barHeight, barWidth - 2, barHeight);
    ctx.fillRect(i * barWidth, baseY, barWidth - 2, barHeight);
  }
};

type RenderOptions = {
  pfpUrl: string | undefined;
  visualizer: boolean;
  frameRate: number;
  bgColor: string;
  duration?: number;
};

export const render = async (file: File, opts: RenderOptions) => {
  // load pfp picture
  let pfpImg: HTMLImageElement | null = null;
  if (opts.pfpUrl) {
    pfpImg = new Image();
    pfpImg.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      pfpImg!.onload = resolve;
      pfpImg!.onerror = reject;
      pfpImg!.src = opts.pfpUrl!;
    });
  }

  const input = new MediaInput({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });

  const audioTrack = await input.getPrimaryAudioTrack();
  if (!audioTrack) throw "no audio track found.";

  if (!(await audioTrack.canDecode()))
    throw "audio track cannot be decoded by browser.";

  const duration = opts.duration ?? (await audioTrack.computeDuration());
  if (!duration) throw "couldn't get audio duration.";

  const videoCodec = await getFirstEncodableVideoCodec(
    new Mp4OutputFormat().getSupportedVideoCodecs(),
    {
      width: renderCanvas.width,
      height: renderCanvas.height,
    },
  );
  if (!videoCodec) throw "your browser doesn't support video encoding.";

  const ctx = renderCanvas.getContext("2d");
  if (!ctx) throw "couldn't get canvas context.";

  const output = new MediaOutput({
    format: new Mp4OutputFormat({
      fastStart: "in-memory",
    }),
    target: new BufferTarget(),
  });
  const conversion = await Conversion.init({
    input,
    output,
  });
  const videoSource = new CanvasSource(renderCanvas, {
    codec: "avc",
    bitrate: QUALITY_MEDIUM,
  });
  output.addVideoTrack(videoSource);
  await output.start();

  const bgColor = opts.bgColor;
  const drawBackground = () => {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
  };

  if (opts.visualizer) {
    const freqData = await extractFrequencyData(file, opts.frameRate);
    const frameDuration = 1 / opts.frameRate;

    // Render animated frames
    for (let i = 0; i < freqData.length; i++) {
      const timestamp = i * frameDuration;
      if (timestamp >= duration) break;

      // bg
      drawBackground();

      if (pfpImg)
        drawCircularVisualizer(ctx, renderCanvas, freqData[i], pfpImg);
      else drawFlatVisualizer(ctx, renderCanvas, freqData[i]);

      await videoSource.add(timestamp);
    }
  } else {
    drawBackground();

    if (pfpImg) {
      const centerX = renderCanvas.width / 2;
      const centerY = renderCanvas.height / 2;
      const baseRadius =
        Math.min(renderCanvas.width, renderCanvas.height) * 0.15;

      drawPfp(ctx, pfpImg, centerX, centerY, baseRadius);
    }

    await videoSource.add(0, duration);
  }

  videoSource.close();
  await conversion.execute();

  return new Blob([output.target.buffer!], { type: "video/mp4" });
};
