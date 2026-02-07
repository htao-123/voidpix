"use client";

import { useState, useRef, useEffect } from "react";
import { Download, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface RemoveWatermarkProps {
  imageFile: File | null;
  imagePreview: string | null;
}

export default function RemoveWatermark({ imagePreview }: RemoveWatermarkProps) {
  const [brushSize, setBrushSize] = useState([20]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  // 加载原始图片
  useEffect(() => {
    if (!imagePreview) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      originalImageRef.current = img;

      // 初始化显示画布
      const displayCanvas = displayCanvasRef.current;
      if (!displayCanvas) return;

      displayCanvas.width = img.width;
      displayCanvas.height = img.height;

      const ctx = displayCanvas.getContext("2d");
      if (!ctx) return;

      // 绘制原始图片作为背景
      ctx.drawImage(img, 0, 0);
    };
    img.src = imagePreview;
  }, [imagePreview]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    const ctx = displayCanvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const coords = getCanvasCoords(e);
    const ctx = displayCanvasRef.current?.getContext("2d");
    if (!ctx) return;

    // 设置半透明红色遮罩
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = brushSize[0];
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    setHasDrawing(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const processRemoval = () => {
    const img = originalImageRef.current;
    const displayCanvas = displayCanvasRef.current;
    if (!img || !displayCanvas) return;

    // 创建处理画布
    const processCanvas = document.createElement("canvas");
    processCanvas.width = img.width;
    processCanvas.height = img.height;

    const processCtx = processCanvas.getContext("2d");
    const displayCtx = displayCanvas.getContext("2d");
    if (!processCtx || !displayCtx) return;

    // 绘制原始图片
    processCtx.drawImage(img, 0, 0);

    // 获取遮罩数据（从显示画布中提取红色遮罩部分）
    const displayData = displayCtx.getImageData(0, 0, displayCanvas.width, displayCanvas.height);
    const processData = processCtx.getImageData(0, 0, processCanvas.width, processCanvas.height);

    const displayPixels = displayData.data;
    const pixels = processData.data;

    // 检测遮罩区域（红色像素）
    for (let i = 0; i < pixels.length; i += 4) {
      // 检查显示画布是否有红色遮罩（R通道明显高于G和B通道）
      const isMasked =
        displayPixels[i] > 150 && // R > 150
        displayPixels[i] > displayPixels[i + 1] * 2 && // R > G * 2
        displayPixels[i] > displayPixels[i + 2] * 2; // R > B * 2

      if (isMasked) {
        const width = processCanvas.width;
        const height = processCanvas.height;
        const pixelIndex = i / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);

        // 从周围取样进行修补
        let r = 0, g = 0, b = 0, count = 0;
        const radius = Math.max(brushSize[0], 10);

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIndex = (ny * width + nx) * 4;

              // 检查该位置是否也被遮罩
              const neighborIsMasked =
                displayPixels[nIndex] > 150 &&
                displayPixels[nIndex] > displayPixels[nIndex + 1] * 2 &&
                displayPixels[nIndex] > displayPixels[nIndex + 2] * 2;

              // 只使用未遮罩的像素
              if (!neighborIsMasked) {
                r += pixels[nIndex];
                g += pixels[nIndex + 1];
                b += pixels[nIndex + 2];
                count++;
              }
            }
          }
        }

        if (count > 0) {
          pixels[i] = r / count;
          pixels[i + 1] = g / count;
          pixels[i + 2] = b / count;
        }
      }
    }

    processCtx.putImageData(processData, 0, 0);
    const resultDataUrl = processCanvas.toDataURL("image/png");
    setProcessedImage(resultDataUrl);
    setResultUrl(resultDataUrl);
    setHasDrawing(false);

    // 重置显示画布为原始图片
    displayCtx.drawImage(img, 0, 0);
  };

  const handleDownload = () => {
    if (!resultUrl) return;

    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "watermark-removed.png";
    a.click();
  };

  const resetCanvas = () => {
    const img = originalImageRef.current;
    const canvas = displayCanvasRef.current;
    if (!img || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    setProcessedImage(null);
    setResultUrl(null);
    setHasDrawing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>去除水印</CardTitle>
        <CardDescription>
          用画笔涂抹水印区域进行去除（简单算法，适合纯色或简单背景）
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="brush-size">画笔大小: {brushSize[0]}px</Label>
          <Slider
            id="brush-size"
            min={5}
            max={50}
            step={5}
            value={brushSize}
            onValueChange={setBrushSize}
          />
        </div>

        <div className="rounded-lg border overflow-hidden bg-muted/30 relative">
          {imagePreview && (
            <div className="relative">
              <canvas
                ref={displayCanvasRef}
                className="max-w-full cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{ display: processedImage ? 'none' : 'block' }}
              />
              {processedImage && (
                <img
                  src={processedImage}
                  alt="Processed result"
                  className="max-w-full"
                />
              )}
            </div>
          )}
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-2">
            <Eraser className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">使用说明：</p>
              <ol className="text-muted-foreground space-y-1 list-decimal list-inside">
                <li>用画笔涂抹需要去除的水印区域（红色半透明遮罩）</li>
                <li>点击"开始处理"按钮进行去水印</li>
                <li>效果不理想可以点击"重置"后重新涂抹</li>
              </ol>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                注意：此功能使用简单的像素平均算法，仅适合纯色或简单背景的水印去除。复杂背景效果有限。
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={processRemoval} disabled={!hasDrawing} className="flex-1">
            <Eraser className="mr-2 h-4 w-4" />
            开始处理
          </Button>
          {resultUrl && (
            <Button onClick={handleDownload} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              下载
            </Button>
          )}
          <Button onClick={resetCanvas} variant="outline" disabled={!processedImage && !hasDrawing}>
            重置
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
