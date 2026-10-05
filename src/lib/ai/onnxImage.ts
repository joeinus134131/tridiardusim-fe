export type ImageNormalization = "unit" | "imagenet";
export type ImageTensorLayout = "nchw" | "nhwc";

/** Resize the lower-left-origin RGB-D camera buffer and normalize it for a float image classifier. */
export function imageToFloatTensor(
  rgba: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
  layout: ImageTensorLayout,
  normalization: ImageNormalization,
) {
  if (![sourceWidth, sourceHeight, width, height].every((value) => Number.isInteger(value) && value > 0)) {
    throw new Error("Dimensi gambar model tidak valid.");
  }
  if (sourceWidth * sourceHeight * 4 !== rgba.length) throw new Error("Buffer RGBA kamera tidak cocok dengan dimensinya.");
  if (width > 1024 || height > 1024) throw new Error("Dimensi input ONNX maksimum 1024×1024.");

  const output = new Float32Array(width * height * 3);
  const mean = normalization === "imagenet" ? [0.485, 0.456, 0.406] : [0, 0, 0];
  const std = normalization === "imagenet" ? [0.229, 0.224, 0.225] : [1, 1, 1];
  for (let y = 0; y < height; y++) {
    const sourceY = sourceHeight - 1 - Math.min(sourceHeight - 1, Math.floor(y * sourceHeight / height));
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor(x * sourceWidth / width));
      const rgbaOffset = (sourceY * sourceWidth + sourceX) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const planar = channel * width * height + y * width + x;
        const offset = layout === "nchw" ? planar : (y * width + x) * 3 + channel;
        const unit = rgba[rgbaOffset + channel] / 255;
        output[offset] = (unit - mean[channel]) / std[channel];
      }
    }
  }
  return output;
}

export function topClassScores(scores: ArrayLike<number>, labels: readonly string[], count = 5) {
  if (scores.length === 0 || scores.length > 100_000) throw new Error("Output ONNX tidak berisi jumlah kelas yang didukung.");
  let max = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < scores.length; index++) {
    const value = Number(scores[index]);
    if (!Number.isFinite(value)) throw new Error("Output model memuat nilai non-finite.");
    max = Math.max(max, value);
  }
  let sum = 0;
  const probabilities = Array.from(scores, (score) => {
    const probability = Math.exp(Number(score) - max);
    sum += probability;
    return probability;
  });
  return probabilities
    .map((probability, index) => ({ index, label: labels[index] || `Class ${index}`, score: probability / sum }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(20, count)));
}
