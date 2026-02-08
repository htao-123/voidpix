// 图像处理工具库 - 共享的处理函数

// ==================== 类型定义 ====================
export type ImageFormat = "png" | "jpeg" | "webp" | "bmp" | "ico";
export type WatermarkType = "text" | "image";
export type Position = "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right";
export type AlgorithmType = "hybrid" | "texture" | "diffusion";

export interface FormatOption {
  value: ImageFormat;
  label: string;
  description: string;
  mimeType: string;
}

export interface WatermarkConfig {
  type: WatermarkType;
  text?: string;
  fontSize?: number;
  opacity?: number;
  position?: Position;
  imageFile?: File;
}

export interface RemovalConfig {
  algorithm: AlgorithmType;
  patchSize: number;
  diffusionPasses: number;
  maskCanvas: HTMLCanvasElement;
}

// ==================== 常量 ====================
export const FORMAT_OPTIONS: FormatOption[] = [
  { value: "png", label: "PNG", description: "无损压缩，适合透明背景", mimeType: "image/png" },
  { value: "jpeg", label: "JPG", description: "有损压缩，文件更小", mimeType: "image/jpeg" },
  { value: "webp", label: "WEBP", description: "现代格式，体积更小", mimeType: "image/webp" },
  { value: "bmp", label: "BMP", description: "位图格式，无压缩", mimeType: "image/bmp" },
  { value: "ico", label: "ICO", description: "图标格式，用于网站favicon", mimeType: "image/x-icon" },
];

export const POSITION_OPTIONS: { value: Position; label: string }[] = [
  { value: "top-left", label: "左上" },
  { value: "top-center", label: "上中" },
  { value: "top-right", label: "右上" },
  { value: "center-left", label: "左中" },
  { value: "center", label: "中心" },
  { value: "center-right", label: "右中" },
  { value: "bottom-left", label: "左下" },
  { value: "bottom-center", label: "下中" },
  { value: "bottom-right", label: "右下" },
];

// ==================== 格式转换 ====================
export async function convertImageFormat(
  file: File,
  format: ImageFormat,
  quality: number = 0.92
): Promise<{ blob: Blob; url: string }> {
  const formatOption = FORMAT_OPTIONS.find(opt => opt.value === format);
  if (!formatOption) throw new Error("Invalid format");

  // 对于 ICO 格式，使用特殊处理
  if (format === "ico") {
    return await convertToICO(file);
  }

  // 使用 canvas 转换其他格式
  return await convertWithCanvas(file, formatOption.mimeType, quality);
}

async function convertToICO(file: File): Promise<{ blob: Blob; url: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = Math.min(img.width, img.height, 256);
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法创建 canvas"));
        return;
      }

      ctx.drawImage(img, 0, 0, size, size);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve({
            blob,
            url: URL.createObjectURL(blob)
          });
        } else {
          reject(new Error("转换失败"));
        }
      }, "image/x-icon");
    };
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = URL.createObjectURL(file);
  });
}

async function convertWithCanvas(
  file: File,
  mimeType: string,
  quality: number
): Promise<{ blob: Blob; url: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法创建 canvas"));
        return;
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve({
            blob,
            url: URL.createObjectURL(blob)
          });
        } else {
          reject(new Error("转换失败"));
        }
      }, mimeType, quality);
    };
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = URL.createObjectURL(file);
  });
}

// ==================== 图片压缩 ====================
export async function compressImage(
  file: File,
  quality: number
): Promise<{ blob: Blob; url: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法创建 canvas"));
        return;
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve({
            blob,
            url: URL.createObjectURL(blob)
          });
        } else {
          reject(new Error("压缩失败"));
        }
      }, "image/jpeg", quality / 100);
    };
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = URL.createObjectURL(file);
  });
}

// ==================== 添加水印 ====================
export async function addWatermark(
  file: File,
  config: WatermarkConfig
): Promise<{ blob: Blob; url: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法创建 canvas"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      ctx.globalAlpha = (config.opacity || 50) / 100;

      if (config.type === "text") {
        drawTextWatermark(ctx, canvas.width, canvas.height, config);
      } else if (config.type === "image" && config.imageFile) {
        drawImageWatermark(ctx, canvas.width, canvas.height, config, img).then(resolve).catch(reject);
        return;
      }

      canvas.toBlob((blob) => {
        if (blob) {
          resolve({
            blob,
            url: URL.createObjectURL(blob)
          });
        } else {
          reject(new Error("添加水印失败"));
        }
      }, "image/png");
    };
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = URL.createObjectURL(file);
  });
}

function drawTextWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: WatermarkConfig
) {
  const fontSize = Math.max(config.fontSize || 24, Math.floor(width / 30));
  const text = config.text || "VoidPix";
  const position = config.position || "bottom-right";

  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = fontSize / 20;

  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = fontSize;
  const padding = fontSize;

  let x = padding;
  let y = padding + textHeight;

  switch (position) {
    case "top-center":
      x = (width - textWidth) / 2;
      break;
    case "top-right":
      x = width - textWidth - padding;
      break;
    case "center-left":
      y = (height + textHeight) / 2;
      break;
    case "center":
      x = (width - textWidth) / 2;
      y = (height + textHeight) / 2;
      break;
    case "center-right":
      x = width - textWidth - padding;
      y = (height + textHeight) / 2;
      break;
    case "bottom-left":
      y = height - padding;
      break;
    case "bottom-center":
      x = (width - textWidth) / 2;
      y = height - padding;
      break;
    case "bottom-right":
      x = width - textWidth - padding;
      y = height - padding;
      break;
  }

  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

async function drawImageWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: WatermarkConfig,
  originalImage: HTMLImageElement
): Promise<{ blob: Blob; url: string }> {
  return new Promise((resolve, reject) => {
    if (!config.imageFile) {
      reject(new Error("水印图片未提供"));
      return;
    }

    const wmImg = new Image();
    wmImg.onload = () => {
      const wmWidth = Math.max(width / 5, 50);
      const wmHeight = (wmImg.height / wmImg.width) * wmWidth;
      const position = config.position || "bottom-right";

      let x = 20;
      let y = 20;

      switch (position) {
        case "top-center":
          x = (width - wmWidth) / 2;
          break;
        case "top-right":
          x = width - wmWidth - 20;
          break;
        case "center-left":
          y = (height - wmHeight) / 2;
          break;
        case "center":
          x = (width - wmWidth) / 2;
          y = (height - wmHeight) / 2;
          break;
        case "center-right":
          x = width - wmWidth - 20;
          y = (height - wmHeight) / 2;
          break;
        case "bottom-left":
          y = height - wmHeight - 20;
          break;
        case "bottom-center":
          x = (width - wmWidth) / 2;
          y = height - wmHeight - 20;
          break;
        case "bottom-right":
          x = width - wmWidth - 20;
          y = height - wmHeight - 20;
          break;
      }

      ctx.drawImage(wmImg, x, y, wmWidth, wmHeight);

      const canvas = ctx.canvas;
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({
            blob,
            url: URL.createObjectURL(blob)
          });
        } else {
          reject(new Error("添加水印失败"));
        }
      }, "image/png");
    };
    wmImg.onerror = () => reject(new Error("水印图片加载失败"));
    wmImg.src = URL.createObjectURL(config.imageFile);
  });
}

// ==================== 去水印算法 ====================

// 基于纹理的图像修复算法（保留细节）
function inpaintTextureBased(
  width: number,
  height: number,
  imageData: Uint8ClampedArray,
  mask: Uint8Array,
  patchSize: number = 7
): Uint8ClampedArray {
  const halfPatch = Math.floor(patchSize / 2);
  const toFill: number[] = [];
  const borderPixels: number[] = [];

  // 找出需要填充的像素和边界像素
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx] === 1) {
        toFill.push(idx);

        let hasKnownNeighbor = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (mask[ny * width + nx] === 0) {
                hasKnownNeighbor = true;
                break;
              }
            }
          }
          if (hasKnownNeighbor) break;
        }
        if (hasKnownNeighbor) {
          borderPixels.push(idx);
        }
      }
    }
  }

  if (toFill.length === 0) return imageData;

  function countKnownNeighbors(idx: number): number {
    const x = idx % width;
    const y = Math.floor(idx / width);
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (mask[ny * width + nx] === 0) count++;
        }
      }
    }
    return count;
  }

  function extractPatch(centerX: number, centerY: number): Float32Array | null {
    if (centerX < halfPatch || centerX >= width - halfPatch ||
        centerY < halfPatch || centerY >= height - halfPatch) {
      return null;
    }

    const patch = new Float32Array(patchSize * patchSize * 3);
    let ptr = 0;

    for (let dy = -halfPatch; dy <= halfPatch; dy++) {
      for (let dx = -halfPatch; dx <= halfPatch; dx++) {
        const idx = ((centerY + dy) * width + (centerX + dx)) * 4;
        patch[ptr++] = imageData[idx];
        patch[ptr++] = imageData[idx + 1];
        patch[ptr++] = imageData[idx + 2];
      }
    }

    return patch;
  }

  function patchDistance(patch1: Float32Array, patch2: Float32Array, mask1: Uint8Array, centerX: number, centerY: number): number {
    let sum = 0;
    let count = 0;

    for (let dy = -halfPatch; dy <= halfPatch; dy++) {
      for (let dx = -halfPatch; dx <= halfPatch; dx++) {
        const px = centerX + dx;
        const py = centerY + dy;
        const patchIdx = (dy + halfPatch) * patchSize + (dx + halfPatch);

        if (px >= 0 && px < width && py >= 0 && py < height && mask1[py * width + px] === 0) {
          const idx = patchIdx * 3;
          const dr = patch1[idx] - patch2[idx];
          const dg = patch1[idx + 1] - patch2[idx + 1];
          const db = patch1[idx + 2] - patch2[idx + 2];
          sum += dr * dr + dg * dg + db * db;
          count++;
        }
      }
    }

    return count > 0 ? sum / count : Infinity;
  }

  function findBestMatch(targetX: number, targetY: number): { x: number; y: number } | null {
    const targetPatch = extractPatch(targetX, targetY);
    if (!targetPatch) return null;

    let bestDist = Infinity;
    let bestX = -1, bestY = -1;

    const numSamples = Math.min(500, (width * height) / 100);

    for (let i = 0; i < numSamples; i++) {
      const angle = (i / numSamples) * Math.PI * 2;
      const dist = Math.random() * Math.min(width, height) * 0.4;

      let candX = Math.floor(width / 2 + Math.cos(angle) * dist);
      let candY = Math.floor(height / 2 + Math.sin(angle) * dist);

      candX = Math.max(halfPatch, Math.min(width - halfPatch - 1, candX));
      candY = Math.max(halfPatch, Math.min(height - halfPatch - 1, candY));

      let hasMask = false;
      for (let dy = -halfPatch; dy <= halfPatch && !hasMask; dy++) {
        for (let dx = -halfPatch; dx <= halfPatch && !hasMask; dx++) {
          const checkX = candX + dx;
          const checkY = candY + dy;
          if (mask[checkY * width + checkX] === 1) {
            hasMask = true;
          }
        }
      }

      if (!hasMask) {
        const candPatch = extractPatch(candX, candY);
        if (candPatch) {
          const dist = patchDistance(targetPatch, candPatch, mask, targetX, targetY);
          if (dist < bestDist) {
            bestDist = dist;
            bestX = candX;
            bestY = candY;
          }
        }
      }
    }

    return bestDist < Infinity ? { x: bestX, y: bestY } : null;
  }

  let iterations = 0;
  const maxIterations = toFill.length * 2;

  while (toFill.length > 0 && iterations < maxIterations) {
    iterations++;

    borderPixels.sort((a, b) => countKnownNeighbors(b) - countKnownNeighbors(a));

    if (borderPixels.length === 0) break;

    const targetIdx = borderPixels.shift()!;
    const targetX = targetIdx % width;
    const targetY = Math.floor(targetIdx / width);

    const match = findBestMatch(targetX, targetY);

    if (match) {
      const sourceIdx = (match.y * width + match.x) * 4;
      const targetIdx4 = targetIdx * 4;

      let sumR = 0, sumG = 0, sumB = 0, weight = 0;

      sumR += imageData[sourceIdx];
      sumG += imageData[sourceIdx + 1];
      sumB += imageData[sourceIdx + 2];
      weight += 2;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = targetX + dx;
          const ny = targetY + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = (ny * width + nx) * 4;
            if (mask[ny * width + nx] === 0) {
              sumR += imageData[nIdx];
              sumG += imageData[nIdx + 1];
              sumB += imageData[nIdx + 2];
              weight += 1;
            }
          }
        }
      }

      imageData[targetIdx4] = Math.round(sumR / weight);
      imageData[targetIdx4 + 1] = Math.round(sumG / weight);
      imageData[targetIdx4 + 2] = Math.round(sumB / weight);
      imageData[targetIdx4 + 3] = 255;

      mask[targetIdx] = 0;

      const fillIdx = toFill.indexOf(targetIdx);
      if (fillIdx > -1) toFill.splice(fillIdx, 1);

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = targetX + dx;
          const ny = targetY + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (mask[nIdx] === 1 && !borderPixels.includes(nIdx)) {
              borderPixels.push(nIdx);
            }
          }
        }
      }
    }
  }

  return imageData;
}

// 基于扩散的图像修复算法（更平滑）
function inpaintDiffusion(
  width: number,
  height: number,
  imageData: Uint8ClampedArray,
  mask: Uint8Array,
  iterations: number = 100
): Uint8ClampedArray {
  for (let iter = 0; iter < iterations; iter++) {
    const prevData = new Uint8ClampedArray(imageData);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        if (mask[idx] === 1) {
          for (let c = 0; c < 3; c++) {
            let sum = 0;
            let count = 0;

            // 8-neighbor average
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;

                const nx = x + dx;
                const ny = y + dy;
                const nIdx = (ny * width + nx) * 4 + c;

                sum += prevData[nIdx];
                count++;
              }
            }

            imageData[idx * 4 + c] = sum / count;
          }
          imageData[idx * 4 + 3] = 255;
        }
      }
    }
  }

  return imageData;
}

// 混合算法：纹理合成 + 扩散平滑
function inpaintHybrid(
  width: number,
  height: number,
  imageData: Uint8ClampedArray,
  mask: Uint8Array,
  patchSize: number,
  diffusionPasses: number
): Uint8ClampedArray {
  // 创建工作副本
  const workMask = new Uint8Array(mask);

  // 第一步：纹理合成填充
  inpaintTextureBased(width, height, imageData, workMask, patchSize);

  // 第二步：扩散平滑
  if (diffusionPasses > 0) {
    inpaintDiffusion(width, height, imageData, mask, diffusionPasses);
  }

  return imageData;
}

// ==================== 去水印 ====================
export async function removeWatermark(
  file: File,
  config: RemovalConfig
): Promise<{ blob: Blob; url: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法创建 canvas"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // 从遮罩canvas获取遮罩数据
      const maskCtx = config.maskCanvas.getContext("2d");
      if (!maskCtx) {
        reject(new Error("无法获取遮罩"));
        return;
      }

      const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);
      const mask = new Uint8Array(canvas.width * canvas.height);

      for (let i = 0; i < mask.length; i++) {
        const idx = i * 4;
        mask[i] = (maskData.data[idx] > 128 || maskData.data[idx + 1] > 128 || maskData.data[idx + 2] > 128) ? 1 : 0;
      }

      // 根据选择的算法执行处理
      switch (config.algorithm) {
        case "texture":
          inpaintTextureBased(canvas.width, canvas.height, imageData.data, mask, config.patchSize);
          break;
        case "diffusion":
          inpaintDiffusion(canvas.width, canvas.height, imageData.data, mask, config.diffusionPasses * 5);
          break;
        case "hybrid":
        default:
          inpaintHybrid(canvas.width, canvas.height, imageData.data, mask, config.patchSize, config.diffusionPasses);
          break;
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve({
            blob,
            url: URL.createObjectURL(blob)
          });
        } else {
          reject(new Error("处理失败"));
        }
      }, "image/png");
    };
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = URL.createObjectURL(file);
  });
}

// ==================== 工具函数 ====================
export function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function getFileExtension(format: ImageFormat): string {
  return format === "jpeg" ? "jpg" : format;
}

export function getMimeType(format: ImageFormat): string {
  const option = FORMAT_OPTIONS.find(opt => opt.value === format);
  return option?.mimeType || "image/png";
}
