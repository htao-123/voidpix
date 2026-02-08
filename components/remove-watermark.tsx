"use client";

import { useState, useRef, useEffect } from "react";
import { Download, Eraser, Loader2, Wand2, Image as ImageIcon, MousePointer2, Square, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RemoveWatermarkProps {
  imageFile: File | null;
  imagePreview: string | null;
}

type AlgorithmType = "hybrid" | "texture" | "diffusion";
type ToolType = "brush" | "rectangle" | "ellipse" | "polygon";

// 基于纹理合成的图像修复算法
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

export default function RemoveWatermark({ imagePreview }: RemoveWatermarkProps) {
  const [brushSize, setBrushSize] = useState([20]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>("hybrid");
  const [patchSize, setPatchSize] = useState([9]);
  const [diffusionPasses, setDiffusionPasses] = useState([20]);
  const [selectedTool, setSelectedTool] = useState<ToolType>("brush");

  // 形状选择相关状态
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  type CompletedShape =
    | { type: 'rectangle'; x: number; y: number; w: number; h: number }
    | { type: 'ellipse'; x: number; y: number; w: number; h: number }
    | { type: 'polygon'; points: Array<{ x: number; y: number }> };

  const [completedShapes, setCompletedShapes] = useState<CompletedShape[]>([]);

  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imagePreview) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      originalImageRef.current = img;

      const displayCanvas = displayCanvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      const tempCanvas = tempCanvasRef.current;
      if (!displayCanvas || !maskCanvas || !tempCanvas) return;

      displayCanvas.width = img.width;
      displayCanvas.height = img.height;
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;

      const ctx = displayCanvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
    };
    img.src = imagePreview;
  }, [imagePreview]);

  // 当多边形点、鼠标位置或已完成形状改变时，重绘预览
  useEffect(() => {
    drawSelectionPreview();
  }, [polygonPoints, mousePosition, selectedTool, completedShapes.length]);

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

  // 绘制选择区域预览
  const drawSelectionPreview = () => {
    const displayCanvas = displayCanvasRef.current;
    const tempCanvas = tempCanvasRef.current;
    const img = originalImageRef.current;
    if (!displayCanvas || !tempCanvas || !img) return;

    const displayCtx = displayCanvas.getContext("2d");
    const tempCtx = tempCanvas.getContext("2d");
    if (!displayCtx || !tempCtx) return;

    // 重绘原始图像
    displayCtx.drawImage(img, 0, 0);

    // 绘制已完成的形状（红色半透明）
    displayCtx.save();
    displayCtx.fillStyle = "rgba(255, 0, 0, 0.3)";
    completedShapes.forEach(shape => {
      displayCtx.beginPath();
      if (shape.type === "rectangle") {
        displayCtx.fillRect(shape.x, shape.y, shape.w, shape.h);
      } else if (shape.type === "ellipse") {
        const centerX = shape.x + shape.w / 2;
        const centerY = shape.y + shape.h / 2;
        const radiusX = shape.w / 2;
        const radiusY = shape.h / 2;
        displayCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        displayCtx.fill();
      } else if (shape.type === "polygon") {
        displayCtx.moveTo(shape.points[0].x, shape.points[0].y);
        shape.points.slice(1).forEach(point => {
          displayCtx.lineTo(point.x, point.y);
        });
        displayCtx.closePath();
        displayCtx.fill();
      }
    });
    displayCtx.restore();

    displayCtx.save();
    displayCtx.strokeStyle = "rgba(255, 0, 0, 0.8)";
    displayCtx.lineWidth = 2;
    displayCtx.setLineDash([5, 5]);

    // 多边形预览 - 显示已添加的点和线
    if (selectedTool === "polygon" && polygonPoints.length > 0) {
      displayCtx.beginPath();
      displayCtx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
      polygonPoints.slice(1).forEach(point => {
        displayCtx.lineTo(point.x, point.y);
      });
      // 如果有鼠标位置，绘制到鼠标位置的预览线
      if (mousePosition) {
        displayCtx.lineTo(mousePosition.x, mousePosition.y);
      }
      displayCtx.stroke();

      // 绘制已添加的点
      displayCtx.setLineDash([]);
      displayCtx.fillStyle = "rgba(255, 0, 0, 0.8)";
      polygonPoints.forEach((point, index) => {
        displayCtx.beginPath();
        displayCtx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        displayCtx.fill();
        // 标记起点
        if (index === 0) {
          displayCtx.strokeStyle = "rgba(0, 0, 255, 0.8)";
          displayCtx.lineWidth = 2;
          displayCtx.stroke();
          displayCtx.strokeStyle = "rgba(255, 0, 0, 0.8)";
          displayCtx.lineWidth = 2;
        }
      });
      displayCtx.restore();
      return;
    }

    if (!selectionStart || !selectionEnd) {
      displayCtx.restore();
      return;
    }

    const x = Math.min(selectionStart.x, selectionEnd.x);
    const y = Math.min(selectionStart.y, selectionEnd.y);
    const w = Math.abs(selectionEnd.x - selectionStart.x);
    const h = Math.abs(selectionEnd.y - selectionStart.y);

    if (selectedTool === "rectangle") {
      displayCtx.strokeRect(x, y, w, h);
    } else if (selectedTool === "ellipse") {
      displayCtx.beginPath();
      const centerX = x + w / 2;
      const centerY = y + h / 2;
      const radiusX = w / 2;
      const radiusY = h / 2;
      displayCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      displayCtx.stroke();
    }

    displayCtx.restore();
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);

    if (selectedTool === "polygon") {
      // 多边形工具：添加点
      setPolygonPoints(prev => [...prev, coords]);
      return;
    }

    setMousePosition(null);
    setIsDrawing(true);
    setSelectionStart(coords);
    setSelectionEnd(coords);

    if (selectedTool === "brush") {
      const ctx = displayCanvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (selectedTool === "polygon") {
      setMousePosition(coords);
      drawSelectionPreview();
      return;
    }

    setMousePosition(null);

    if (!isDrawing) {
      if (selectedTool === "rectangle" || selectedTool === "ellipse") {
        setSelectionEnd(coords);
        drawSelectionPreview();
      }
      return;
    }

    if (selectedTool === "brush") {
      const displayCtx = displayCanvasRef.current?.getContext("2d");
      const maskCtx = maskCanvasRef.current?.getContext("2d");
      if (!displayCtx || !maskCtx) return;

      displayCtx.lineWidth = brushSize[0];
      displayCtx.lineCap = "round";
      displayCtx.lineJoin = "round";
      displayCtx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      displayCtx.lineTo(coords.x, coords.y);
      displayCtx.stroke();

      maskCtx.lineWidth = brushSize[0];
      maskCtx.lineCap = "round";
      maskCtx.lineJoin = "round";
      maskCtx.strokeStyle = "white";
      maskCtx.lineTo(coords.x, coords.y);
      maskCtx.stroke();

      setHasDrawing(true);
    } else if (selectedTool === "rectangle" || selectedTool === "ellipse") {
      setSelectionEnd(coords);
      drawSelectionPreview();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if ((selectedTool === "rectangle" || selectedTool === "ellipse") && selectionStart && selectionEnd) {
      // 将选择区域绘制到遮罩
      const maskCtx = maskCanvasRef.current?.getContext("2d");
      const displayCanvas = displayCanvasRef.current;
      if (!maskCtx || !displayCanvas) return;

      const x = Math.min(selectionStart.x, selectionEnd.x);
      const y = Math.min(selectionStart.y, selectionEnd.y);
      const w = Math.abs(selectionEnd.x - selectionStart.x);
      const h = Math.abs(selectionEnd.y - selectionStart.y);

      // 添加到已完成形状列表
      setCompletedShapes(prev => [...prev, { type: selectedTool, x, y, w, h }]);

      maskCtx.fillStyle = "white";
      maskCtx.beginPath();

      if (selectedTool === "rectangle") {
        maskCtx.fillRect(x, y, w, h);
      } else if (selectedTool === "ellipse") {
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        const radiusX = w / 2;
        const radiusY = h / 2;
        maskCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        maskCtx.fill();
      }

      setHasDrawing(true);
      setSelectionStart(null);
      setSelectionEnd(null);
      // 重绘预览以显示所有形状
      setTimeout(() => drawSelectionPreview(), 0);
    }
  };

  // 完成多边形选择
  const finishPolygon = () => {
    if (polygonPoints.length < 3) return;

    const maskCtx = maskCanvasRef.current?.getContext("2d");
    const displayCtx = displayCanvasRef.current?.getContext("2d");
    if (!maskCtx || !displayCtx) return;

    // 添加到已完成形状列表
    setCompletedShapes(prev => [...prev, { type: 'polygon', points: [...polygonPoints] }]);

    maskCtx.fillStyle = "white";
    maskCtx.beginPath();
    maskCtx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
    polygonPoints.slice(1).forEach(point => {
      maskCtx.lineTo(point.x, point.y);
    });
    maskCtx.closePath();
    maskCtx.fill();

    setPolygonPoints([]);
    setMousePosition(null);
    setHasDrawing(true);
    // 重绘预览以显示所有形状
    setTimeout(() => drawSelectionPreview(), 0);
  };

  const processRemoval = () => {
    const img = originalImageRef.current;
    const displayCanvas = displayCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!img || !displayCanvas || !maskCanvas) return;

    setIsProcessing(true);

    setTimeout(() => {
      try {
        const processCanvas = document.createElement("canvas");
        processCanvas.width = img.width;
        processCanvas.height = img.height;

        const processCtx = processCanvas.getContext("2d");
        if (!processCtx) return;

        processCtx.drawImage(img, 0, 0);
        const imageData = processCtx.getImageData(0, 0, processCanvas.width, processCanvas.height);

        const maskCtx = maskCanvas.getContext("2d");
        if (!maskCtx) return;
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

        const mask = new Uint8Array(processCanvas.width * processCanvas.height);
        for (let i = 0; i < mask.length; i++) {
          const idx = i * 4;
          mask[i] = (maskData.data[idx] > 128 || maskData.data[idx + 1] > 128 || maskData.data[idx + 2] > 128) ? 1 : 0;
        }

        switch (algorithm) {
          case "texture":
            inpaintTextureBased(processCanvas.width, processCanvas.height, imageData.data, mask, patchSize[0]);
            break;
          case "diffusion":
            inpaintDiffusion(processCanvas.width, processCanvas.height, imageData.data, mask, diffusionPasses[0] * 5);
            break;
          case "hybrid":
          default:
            inpaintHybrid(processCanvas.width, processCanvas.height, imageData.data, mask, patchSize[0], diffusionPasses[0]);
            break;
        }

        processCtx.putImageData(imageData, 0, 0);
        const resultDataUrl = processCanvas.toDataURL("image/png");
        setProcessedImage(resultDataUrl);
        setResultUrl(resultDataUrl);
        setHasDrawing(false);

        const displayCtx = displayCanvas.getContext("2d");
        if (displayCtx) {
          displayCtx.drawImage(img, 0, 0);
        }

        if (maskCtx) {
          maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        }

      } catch (error) {
        console.error("处理失败:", error);
      } finally {
        setIsProcessing(false);
      }
    }, 50);
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
    const displayCanvas = displayCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!img || !displayCanvas || !maskCanvas) return;

    const displayCtx = displayCanvas.getContext("2d");
    const maskCtx = maskCanvas.getContext("2d");
    if (!displayCtx || !maskCtx) return;

    displayCtx.drawImage(img, 0, 0);
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    setProcessedImage(null);
    setResultUrl(null);
    setHasDrawing(false);
    setPolygonPoints([]);
    setSelectionStart(null);
    setSelectionEnd(null);
    setMousePosition(null);
    setCompletedShapes([]);
  };

  const getToolIcon = (tool: ToolType) => {
    switch (tool) {
      case "brush": return <Eraser className="h-4 w-4" />;
      case "rectangle": return <Square className="h-4 w-4" />;
      case "ellipse": return <Circle className="h-4 w-4" />;
      case "polygon": return <MousePointer2 className="h-4 w-4" />;
    }
  };

  const getToolName = (tool: ToolType) => {
    switch (tool) {
      case "brush": return "画笔";
      case "rectangle": return "矩形";
      case "ellipse": return "椭圆";
      case "polygon": return "多边形";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-blue-500" />
          <div>
            <CardTitle>智能去水印</CardTitle>
            <CardDescription>
              选择最适合的工具和算法去除图片中的水印、文字或不需要的物体
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 工具选择 */}
        <div className="space-y-3">
          <Label htmlFor="tool">选择工具</Label>
          <div className="grid grid-cols-4 gap-2">
            {(["brush", "rectangle", "ellipse", "polygon"] as ToolType[]).map((tool) => (
              <Button
                key={tool}
                variant={selectedTool === tool ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedTool(tool);
                  resetCanvas();
                }}
                className="flex flex-col gap-1 h-auto py-2"
              >
                {getToolIcon(tool)}
                <span className="text-xs">{getToolName(tool)}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* 算法选择 */}
        <div className="space-y-3">
          <Label htmlFor="algorithm">选择算法</Label>
          <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as AlgorithmType)}>
            <SelectTrigger id="algorithm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hybrid">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="font-medium">混合模式（推荐）</div>
                    <div className="text-xs text-muted-foreground">纹理合成 + 平滑处理，效果最佳</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="texture">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <div>
                    <div className="font-medium">纹理合成</div>
                    <div className="text-xs text-muted-foreground">适合重复纹理，保留更多细节</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="diffusion">
                <div className="flex items-center gap-2">
                  <Eraser className="h-4 w-4" />
                  <div>
                    <div className="font-medium">扩散平滑</div>
                    <div className="text-xs text-muted-foreground">适合渐变背景，结果更平滑</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 参数调节 */}
        <div className="grid grid-cols-3 gap-4">
          {selectedTool === "brush" && (
            <div className="space-y-2">
              <Label htmlFor="brush-size">画笔: {brushSize[0]}px</Label>
              <Slider
                id="brush-size"
                min={5}
                max={50}
                step={5}
                value={brushSize}
                onValueChange={setBrushSize}
              />
            </div>
          )}
          {algorithm !== "diffusion" && (
            <div className="space-y-2">
              <Label htmlFor="patch-size">块大小: {patchSize[0]}</Label>
              <Slider
                id="patch-size"
                min={5}
                max={15}
                step={2}
                value={patchSize}
                onValueChange={setPatchSize}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="smoothness">
              {algorithm === "texture" ? "快速模式" : "平滑度: " + (algorithm === "diffusion" ? diffusionPasses[0] * 5 : diffusionPasses[0])}
            </Label>
            <Slider
              id="smoothness"
              min={5}
              max={50}
              step={5}
              value={algorithm === "diffusion" ? [diffusionPasses[0] * 5] : diffusionPasses}
              onValueChange={(v) => setDiffusionPasses(algorithm === "diffusion" ? [v[0] / 5] : v)}
            />
          </div>
        </div>

        {/* 工具说明 */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="text-muted-foreground">
            {selectedTool === "brush" && "🖌️ 按住鼠标拖动绘制遮罩区域"}
            {selectedTool === "rectangle" && "📐 拖拽鼠标选择矩形区域"}
            {selectedTool === "ellipse" && "⚪ 拖拽鼠标选择椭圆区域"}
            {selectedTool === "polygon" && "⬡ 点击添加点，双击或点击「完成」闭合多边形"}
          </p>
        </div>

        <canvas
          ref={maskCanvasRef}
          style={{ display: 'none' }}
        />
        <canvas
          ref={tempCanvasRef}
          style={{ display: 'none' }}
        />

        {/* 画布区域 */}
        <div className="rounded-lg border overflow-hidden bg-muted/30 relative">
          {imagePreview && (
            <div className="relative">
              <canvas
                ref={displayCanvasRef}
                className="max-w-full"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={() => {
                  setMousePosition(null);
                  stopDrawing();
                }}
                onDoubleClick={() => {
                  if (selectedTool === "polygon") {
                    finishPolygon();
                  }
                }}
                style={{ display: processedImage ? 'none' : 'block', cursor: selectedTool === 'brush' ? 'crosshair' : 'default' }}
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

        {/* 多边形完成按钮 */}
        {selectedTool === "polygon" && polygonPoints.length >= 3 && (
          <Button onClick={finishPolygon} variant="outline" className="w-full">
            完成多边形选择
          </Button>
        )}

        {/* 使用说明 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                3
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <p className="font-medium text-blue-900 dark:text-blue-100">简单三步去除水印</p>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-xs">1</div>
                  <span className="text-blue-800 dark:text-blue-200">选择区域</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-xs">2</div>
                  <span className="text-blue-800 dark:text-blue-200">选择算法</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-xs">3</div>
                  <span className="text-blue-800 dark:text-blue-200">处理下载</span>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-200 dark:border-blue-800 mt-2">
                <p className="text-blue-700 dark:text-blue-300">
                  💡 <strong>提示：</strong>
                  {selectedTool === "polygon" ? "多边形工具适合不规则形状，点击添加点，双击完成选择。" :
                   selectedTool === "rectangle" ? "矩形选框适合规则形状的水印。" :
                   selectedTool === "ellipse" ? "椭圆选框适合圆形或椭圆形水印。" :
                   algorithm === "hybrid" ? "混合模式适合大多数情况，能平衡细节和平滑度。" :
                   algorithm === "texture" ? "纹理模式适合草地、墙壁、天空等有重复纹理的场景。" :
                   "扩散模式适合纯色背景或渐变区域，结果更平滑。"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            onClick={processRemoval}
            disabled={!hasDrawing || isProcessing}
            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                开始处理
              </>
            )}
          </Button>
          {resultUrl && (
            <Button onClick={handleDownload} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              下载
            </Button>
          )}
          <Button onClick={resetCanvas} variant="outline" disabled={!processedImage && !hasDrawing && polygonPoints.length === 0}>
            重置
          </Button>
        </div>

        {/* 算法说明 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>🔹 <strong>混合模式</strong>：结合纹理合成和扩散平滑，适合大多数场景</p>
          <p>🔹 <strong>纹理模式</strong>：从图像中查找相似纹理块填充，保留细节</p>
          <p>🔹 <strong>扩散模式</strong>：通过像素扩散平滑填充，适合简单背景</p>
        </div>
      </CardContent>
    </Card>
  );
}
