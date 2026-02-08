/**
 * AI 智能水印检测和去除工具库
 * 使用更激进的方法直接处理常见水印位置
 */

export interface WatermarkRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface WatermarkDetectionResult {
  hasWatermark: boolean;
  regions: WatermarkRegion[];
  detectedType: 'text' | 'logo' | 'pattern' | 'none';
}

/**
 * 水印检测器类 - 更激进的检测策略
 */
export class WatermarkDetector {
  /**
   * 智能检测图片中的水印 - 采用"宁可错杀不可放过"的策略
   */
  async detect(imageData: ImageData): Promise<WatermarkDetectionResult> {
    const { width, height } = imageData;

    // 直接返回常见水印位置，不做任何过滤
    const regions: WatermarkRegion[] = [];

    // 右下角 - 最常见的水印位置，最大优先级
    if (width > 200 && height > 100) {
      regions.push({
        x: width - Math.min(400, width * 0.4),
        y: height - Math.min(150, height * 0.2),
        width: Math.min(400, width * 0.4),
        height: Math.min(150, height * 0.2),
        confidence: 0.95
      });
    }

    // 左下角
    if (width > 200 && height > 100) {
      regions.push({
        x: 0,
        y: height - Math.min(120, height * 0.15),
        width: Math.min(300, width * 0.3),
        height: Math.min(120, height * 0.15),
        confidence: 0.85
      });
    }

    // 右上角
    if (width > 200) {
      regions.push({
        x: width - Math.min(300, width * 0.3),
        y: 0,
        width: Math.min(300, width * 0.3),
        height: Math.min(120, height * 0.15),
        confidence: 0.80
      });
    }

    // 左上角
    if (width > 200) {
      regions.push({
        x: 0,
        y: 0,
        width: Math.min(250, width * 0.25),
        height: Math.min(100, height * 0.15),
        confidence: 0.75
      });
    }

    // 底部中间 - 横幅水印常见位置
    if (width > 300) {
      regions.push({
        x: width * 0.2,
        y: height - Math.min(80, height * 0.1),
        width: width * 0.6,
        height: Math.min(80, height * 0.1),
        confidence: 0.70
      });
    }

    return {
      hasWatermark: true, // 总是返回 true，因为我们要主动处理
      regions,
      detectedType: 'pattern'
    };
  }
}

/**
 * AI 图像修复器 - 更激进的修复策略
 */
export class AIInpainter {
  /**
   * 智能修复指定区域 - 使用 patch-based 算法
   */
  inpaint(
    imageData: ImageData,
    mask: ImageData,
    options: {
      method?: 'telea' | 'aggressive' | 'patch';
      iterations?: number;
      patchSize?: number;
    } = {}
  ): ImageData {
    const { method = 'patch', iterations = 100, patchSize = 7 } = options;

    if (method === 'patch') {
      return this.patchBasedInpaint(imageData, mask, patchSize);
    }

    if (method === 'aggressive') {
      return this.aggressiveInpaint(imageData, mask);
    }

    return this.neighborInpaint(imageData, mask, iterations);
  }

  /**
   * Patch-based 修复算法 - 改进版，更激进的策略
   * 多尺度填充 + 智能纹理匹配
   */
  private patchBasedInpaint(
    imageData: ImageData,
    mask: ImageData,
    patchSize: number = 7
  ): ImageData {
    const { data, width, height } = imageData;
    const { data: maskData } = mask;

    // 创建工作副本
    const resultData = new Uint8ClampedArray(data);
    const workMask = new Uint8ClampedArray(maskData);

    // 计算需要修复的区域
    const maskPixels = new Set<number>();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (workMask[idx + 3] > 128) {
          maskPixels.add(y * width + x);
        }
      }
    }

    if (maskPixels.size === 0) return imageData;

    const halfPatch = Math.floor(patchSize / 2);

    // 第一阶段：使用快速填充从边界向内填充
    for (let pass = 0; pass < 3; pass++) {
      const boundaryPixels: number[] = [];

      // 找出所有边界像素
      for (const pixelIdx of maskPixels) {
        const x = pixelIdx % width;
        const y = Math.floor(pixelIdx / width);

        let isBoundary = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (!maskPixels.has(ny * width + nx)) {
                isBoundary = true;
                break;
              }
            }
          }
          if (isBoundary) break;
        }
        if (isBoundary) {
          boundaryPixels.push(pixelIdx);
        }
      }

      // 填充边界像素
      for (const pixelIdx of boundaryPixels) {
        const x = pixelIdx % width;
        const y = Math.floor(pixelIdx / width);

        // 寻找最佳源 patch - 优先考虑附近的区域
        let bestPatch: { x: number; y: number; score: number } | null = null;
        let bestScore = Infinity;

        // 增加采样次数，并优先从附近区域采样
        const searchRadius = Math.min(100, Math.max(50, maskPixels.size));
        const samples = 2000;

        for (let s = 0; s < samples; s++) {
          // 优先从附近采样
          let sx, sy;
          if (s < samples * 0.7) {
            // 70% 从附近采样
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * searchRadius;
            sx = Math.floor(x + Math.cos(angle) * dist);
            sy = Math.floor(y + Math.sin(angle) * dist);
          } else {
            // 30% 全局采样
            sx = halfPatch + Math.floor(Math.random() * (width - patchSize));
            sy = halfPatch + Math.floor(Math.random() * (height - patchSize));
          }

          // 确保在有效范围内
          sx = Math.max(halfPatch, Math.min(width - halfPatch - 1, sx));
          sy = Math.max(halfPatch, Math.min(height - halfPatch - 1, sy));

          // 检查源 patch 是否有效
          let validSource = true;
          let validPixels = 0;
          for (let dy = -halfPatch; dy <= halfPatch && validSource; dy++) {
            for (let dx = -halfPatch; dx <= halfPatch && validSource; dx++) {
              const nx = sx + dx;
              const ny = sy + dy;
              const nIdx = ny * width + nx;
              if (maskPixels.has(nIdx)) {
                validSource = false;
              } else {
                validPixels++;
              }
            }
          }
          if (validSource && validPixels < patchSize * patchSize * 0.5) {
            validSource = false;
          }

          if (!validSource) continue;

          // 计算相似度分数
          let score = 0;
          let weightSum = 0;
          let count = 0;

          for (let dy = -halfPatch; dy <= halfPatch; dy++) {
            for (let dx = -halfPatch; dx <= halfPatch; dx++) {
              const tx = x + dx;
              const ty = y + dy;

              if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
                const tIdx = ty * width + tx;
                const sIdx = (sy + dy) * width + (sx + dx);

                // 只比较已知像素
                if (!maskPixels.has(tIdx)) {
                  const targetIdx = tIdx * 4;
                  const sourceIdx = sIdx * 4;

                  const dr = resultData[targetIdx] - resultData[sourceIdx];
                  const dg = resultData[targetIdx + 1] - resultData[sourceIdx + 1];
                  const db = resultData[targetIdx + 2] - resultData[sourceIdx + 2];

                  // 距离权重 - 越近权重越高
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  const weight = 1 / (dist + 1);

                  score += (dr * dr + dg * dg + db * db) * weight;
                  weightSum += weight;
                  count++;
                }
              }
            }
          }

          if (count > 0) {
            const avgScore = score / weightSum;
            // 考虑源 patch 的距离
            const sourceDist = Math.sqrt((sx - x) ** 2 + (sy - y) ** 2);
            const finalScore = avgScore + sourceDist * 0.1;

            if (finalScore < bestScore) {
              bestScore = finalScore;
              bestPatch = { x: sx, y: sy, score: finalScore };
            }
          }
        }

        // 复制最佳 patch
        if (bestPatch) {
          for (let dy = -halfPatch; dy <= halfPatch; dy++) {
            for (let dx = -halfPatch; dx <= halfPatch; dx++) {
              const tx = x + dx;
              const ty = y + dy;

              if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
                const tIdx = ty * width + tx;
                const sIdx = (bestPatch.y + dy) * width + (bestPatch.x + dx);

                if (maskPixels.has(tIdx)) {
                  const targetIdx = tIdx * 4;
                  const sourceIdx = sIdx * 4;

                  resultData[targetIdx] = resultData[sourceIdx];
                  resultData[targetIdx + 1] = resultData[sourceIdx + 1];
                  resultData[targetIdx + 2] = resultData[sourceIdx + 2];
                  resultData[targetIdx + 3] = 255;
                }
              }
            }
          }
        }
      }
    }

    // 第二阶段：对剩余的掩码像素进行强力填充
    if (maskPixels.size > 0) {
      // 找到所有有效像素作为源
      const validPixels: { x: number; y: number; color: [number, number, number] }[] = [];
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          const idx = y * width + x;
          if (!maskPixels.has(idx)) {
            const pixelIdx = idx * 4;
            validPixels.push({
              x, y,
              color: [resultData[pixelIdx], resultData[pixelIdx + 1], resultData[pixelIdx + 2]]
            });
          }
        }
      }

      // 对每个剩余的掩码像素，找到最近的有效像素并复制
      for (const pixelIdx of maskPixels) {
        const x = pixelIdx % width;
        const y = Math.floor(pixelIdx / width);

        let nearestPixel: typeof validPixels[0] | null = null;
        let minDist = Infinity;

        // 找到最近的有效像素
        for (let i = 0; i < Math.min(1000, validPixels.length); i++) {
          const randIdx = Math.floor(Math.random() * validPixels.length);
          const vp = validPixels[randIdx];
          const dist = Math.sqrt((vp.x - x) ** 2 + (vp.y - y) ** 2);

          if (dist < minDist) {
            minDist = dist;
            nearestPixel = vp;
          }
        }

        if (nearestPixel) {
          const targetIdx = pixelIdx * 4;
          resultData[targetIdx] = nearestPixel.color[0];
          resultData[targetIdx + 1] = nearestPixel.color[1];
          resultData[targetIdx + 2] = nearestPixel.color[2];
          resultData[targetIdx + 3] = 255;
        }
      }
    }

    // 第三阶段：应用强力模糊来平滑接缝
    const finalBlurRadius = Math.max(10, patchSize);
    const tempData = new Uint8ClampedArray(resultData);

    // 扩展模糊区域到原掩码周围
    const blurMask = new Set<number>();
    for (const pixelIdx of maskPixels) {
      const x = pixelIdx % width;
      const y = Math.floor(pixelIdx / width);
      for (let dy = -finalBlurRadius; dy <= finalBlurRadius; dy++) {
        for (let dx = -finalBlurRadius; dx <= finalBlurRadius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            blurMask.add(ny * width + nx);
          }
        }
      }
    }

    // 应用高斯模糊
    for (const pixelIdx of blurMask) {
      const x = pixelIdx % width;
      const y = Math.floor(pixelIdx / width);

      let sumR = 0, sumG = 0, sumB = 0, weightSum = 0;

      for (let dy = -finalBlurRadius; dy <= finalBlurRadius; dy++) {
        for (let dx = -finalBlurRadius; dx <= finalBlurRadius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= finalBlurRadius) {
              const gaussianWeight = Math.exp(-(dist * dist) / (2 * (finalBlurRadius / 2) ** 2));
              const idx = (ny * width + nx) * 4;
              sumR += tempData[idx] * gaussianWeight;
              sumG += tempData[idx + 1] * gaussianWeight;
              sumB += tempData[idx + 2] * gaussianWeight;
              weightSum += gaussianWeight;
            }
          }
        }
      }

      if (weightSum > 0) {
        const idx = pixelIdx * 4;
        resultData[idx] = Math.round(sumR / weightSum);
        resultData[idx + 1] = Math.round(sumG / weightSum);
        resultData[idx + 2] = Math.round(sumB / weightSum);
        resultData[idx + 3] = 255;
      }
    }

    return new ImageData(resultData, width, height);
  }

  /**
   * 激进修复方法 - 使用扩展的邻居填充 + 模糊
   */
  private aggressiveInpaint(
    imageData: ImageData,
    mask: ImageData
  ): ImageData {
    const { data, width, height } = imageData;
    const { data: maskData } = mask;

    // 首先标记所有需要修复的像素
    const toRepair = new Set<number>();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (maskData[idx + 3] > 128) {
          toRepair.add(y * width + x);
        }
      }
    }

    if (toRepair.size === 0) return imageData;

    // 多次迭代修复
    for (let iter = 0; iter < 50; iter++) {
      const newPixels = new Map<number, { r: number; g: number; b: number }>();

      for (const pixelIdx of toRepair) {
        const x = pixelIdx % width;
        const y = Math.floor(pixelIdx / width);

        // 收集有效邻居像素
        const neighbors: { r: number; g: number; b: number }[] = [];
        const weights: number[] = [];

        // 扩大搜索范围到 15 像素
        const searchRadius = 15;
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
          for (let dx = -searchRadius; dx <= searchRadius; dx++) {
            if (dx === 0 && dy === 0) continue;

            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;

              // 只使用不在修复区域的像素
              if (!toRepair.has(nIdx)) {
                const idx = nIdx * 4;
                neighbors.push({
                  r: data[idx],
                  g: data[idx + 1],
                  b: data[idx + 2]
                });

                // 距离权重 - 越近权重越高
                const dist = Math.sqrt(dx * dx + dy * dy);
                weights.push(1 / (dist + 1));
              }
            }
          }
        }

        if (neighbors.length > 0) {
          // 加权平均
          let sumR = 0, sumG = 0, sumB = 0, weightSum = 0;
          for (let i = 0; i < neighbors.length; i++) {
            const w = weights[i];
            sumR += neighbors[i].r * w;
            sumG += neighbors[i].g * w;
            sumB += neighbors[i].b * w;
            weightSum += w;
          }

          newPixels.set(pixelIdx, {
            r: Math.round(sumR / weightSum),
            g: Math.round(sumG / weightSum),
            b: Math.round(sumB / weightSum)
          });
        }
      }

      // 应用新像素
      for (const [pixelIdx, color] of newPixels) {
        const idx = pixelIdx * 4;
        data[idx] = color.r;
        data[idx + 1] = color.g;
        data[idx + 2] = color.b;
        data[idx + 3] = 255;
      }

      // 移除已修复的像素
      for (const pixelIdx of newPixels.keys()) {
        toRepair.delete(pixelIdx);
      }

      if (toRepair.size === 0) break;
    }

    // 对修复区域应用轻微模糊以平滑边界
    return this.applyBlurToMaskedAreas(imageData, mask);
  }

  /**
   * 对修复区域应用轻微模糊
   */
  private applyBlurToMaskedAreas(
    imageData: ImageData,
    mask: ImageData
  ): ImageData {
    const { data, width, height } = imageData;
    const { data: maskData } = mask;

    // 扩展掩码区域
    const extendedMask = new Set<number>();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (maskData[idx + 3] > 128) {
          // 扩展 5 像素
          for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                extendedMask.add(ny * width + nx);
              }
            }
          }
        }
      }
    }

    // 应用简单模糊
    const blurredData = new Uint8ClampedArray(data);
    for (const pixelIdx of extendedMask) {
      const x = pixelIdx % width;
      const y = Math.floor(pixelIdx / width);

      let sumR = 0, sumG = 0, sumB = 0, count = 0;

      // 3x3 均值模糊
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4;
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            count++;
          }
        }
      }

      const idx = pixelIdx * 4;
      blurredData[idx] = Math.round(sumR / count);
      blurredData[idx + 1] = Math.round(sumG / count);
      blurredData[idx + 2] = Math.round(sumB / count);
      blurredData[idx + 3] = 255;
    }

    return new ImageData(blurredData, width, height);
  }

  /**
   * 邻居像素修复算法
   */
  private neighborInpaint(
    imageData: ImageData,
    mask: ImageData,
    iterations: number
  ): ImageData {
    const { data, width, height } = imageData;
    const { data: maskData } = mask;

    const maskPixels = new Set<number>();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (maskData[idx + 3] > 128) {
          maskPixels.add(y * width + x);
        }
      }
    }

    for (let iter = 0; iter < iterations; iter++) {
      const newPixels = new Map<number, { r: number; g: number; b: number }>();

      for (const pixelIdx of maskPixels) {
        const neighbors: { r: number; g: number; b: number }[] = [];
        const x = pixelIdx % width;
        const y = Math.floor(pixelIdx / width);

        // 8 邻域
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (!maskPixels.has(nIdx)) {
                const idx = nIdx * 4;
                neighbors.push({
                  r: data[idx],
                  g: data[idx + 1],
                  b: data[idx + 2]
                });
              }
            }
          }
        }

        if (neighbors.length > 0) {
          const avgR = neighbors.reduce((s, c) => s + c.r, 0) / neighbors.length;
          const avgG = neighbors.reduce((s, c) => s + c.g, 0) / neighbors.length;
          const avgB = neighbors.reduce((s, c) => s + c.b, 0) / neighbors.length;

          newPixels.set(pixelIdx, {
            r: Math.round(avgR),
            g: Math.round(avgG),
            b: Math.round(avgB)
          });
        }
      }

      for (const [pixelIdx, color] of newPixels) {
        const idx = pixelIdx * 4;
        data[idx] = color.r;
        data[idx + 1] = color.g;
        data[idx + 2] = color.b;
        data[idx + 3] = 255;
      }

      for (const pixelIdx of newPixels.keys()) {
        maskPixels.delete(pixelIdx);
      }

      if (maskPixels.size === 0) break;
    }

    return imageData;
  }
}

/**
 * 一站式智能去水印函数
 */
export async function smartRemoveWatermark(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  customRegions?: WatermarkRegion[],
  options?: {
    patchSize?: number;
    method?: 'patch' | 'aggressive';
  }
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');

  let source: HTMLImageElement | HTMLCanvasElement;

  if (imageElement instanceof HTMLImageElement) {
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    source = imageElement;
  } else {
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    source = imageElement;
  }

  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // 使用自定义区域或检测水印
  let regions = customRegions;
  if (!regions || regions.length === 0) {
    const detector = new WatermarkDetector();
    const detection = await detector.detect(imageData);
    regions = detection.regions;
  }

  if (!regions || regions.length === 0) {
    return canvasToBlob(canvas);
  }

  console.log('处理水印区域:', regions);

  // 创建修复掩码
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = canvas.width;
  maskCanvas.height = canvas.height;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) throw new Error('无法创建掩码 Canvas 上下文');

  const { patchSize = 7, method = 'patch' } = options || {};

  // 填充掩码，并稍微扩展区域以确保覆盖整个水印
  maskCtx.fillStyle = 'white';
  regions.forEach(region => {
    // 扩展区域 10%
    const expandX = Math.max(5, region.width * 0.1);
    const expandY = Math.max(5, region.height * 0.1);
    maskCtx.fillRect(
      Math.max(0, region.x - expandX),
      Math.max(0, region.y - expandY),
      region.width + expandX * 2,
      region.height + expandY * 2
    );
  });

  const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

  // AI 修复 - 使用指定方法
  const inpainter = new AIInpainter();
  const resultData = inpainter.inpaint(imageData, maskData, {
    method,
    iterations: 100,
    patchSize
  });

  ctx.putImageData(resultData, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else resolve(new Blob([], { type: 'image/png' }));
    }, 'image/png');
  });
}

/**
 * Canvas 转 Blob 辅助函数
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else resolve(new Blob([], { type: 'image/png' }));
    }, 'image/png');
  });
}

/**
 * 进度回调选项
 */
export interface ProgressCallbacks {
  onProgress?: (progress: number, step: 'detect' | 'analyze' | 'inpaint' | 'finalize') => void;
  onDetectionComplete?: (result: WatermarkDetectionResult) => void;
}

/**
 * 去水印处理选项
 */
export interface WatermarkRemovalOptions {
  customRegions?: WatermarkRegion[];
  patchSize?: number;
  method?: 'telea' | 'aggressive' | 'patch';
}

/**
 * 带进度提示的智能去水印函数
 */
export async function smartRemoveWatermarkWithProgress(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  callbacks?: ProgressCallbacks,
  options?: WatermarkRemovalOptions
): Promise<Blob> {
  const { onProgress, onDetectionComplete } = callbacks || {};
  const { customRegions, patchSize = 7, method = 'patch' } = options || {};

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');

  let source: HTMLImageElement | HTMLCanvasElement;

  if (imageElement instanceof HTMLImageElement) {
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    source = imageElement;
  } else {
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    source = imageElement;
  }

  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // 使用自定义区域或检测水印
  let regions = customRegions;
  let detection: WatermarkDetectionResult | null = null;

  if (!regions || regions.length === 0) {
    onProgress?.(20, 'detect');

    const detector = new WatermarkDetector();
    detection = await detector.detect(imageData);
    regions = detection.regions;

    if (onDetectionComplete && detection) {
      onDetectionComplete(detection);
    }
  }

  onProgress?.(40, 'analyze');

  if (!regions || regions.length === 0) {
    onProgress?.(100, 'finalize');
    return canvasToBlob(canvas);
  }

  console.log('处理水印区域:', regions);

  onProgress?.(50, 'inpaint');

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = canvas.width;
  maskCanvas.height = canvas.height;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) throw new Error('无法创建掩码 Canvas 上下文');

  maskCtx.fillStyle = 'white';
  regions.forEach(region => {
    const expandX = Math.max(5, region.width * 0.1);
    const expandY = Math.max(5, region.height * 0.1);
    maskCtx.fillRect(
      Math.max(0, region.x - expandX),
      Math.max(0, region.y - expandY),
      region.width + expandX * 2,
      region.height + expandY * 2
    );
  });

  const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

  const inpainter = new AIInpainter();
  const resultData = inpainter.inpaint(imageData, maskData, {
    method,
    iterations: 100,
    patchSize
  });

  onProgress?.(70, 'inpaint');
  await new Promise(resolve => setTimeout(resolve, 100));
  onProgress?.(90, 'inpaint');

  onProgress?.(95, 'finalize');
  ctx.putImageData(resultData, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      onProgress?.(100, 'finalize');
      if (blob) resolve(blob);
      else resolve(new Blob([], { type: 'image/png' }));
    }, 'image/png');
  });
}
