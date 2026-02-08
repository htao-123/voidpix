"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Download, Eraser, Loader2, Wand2, Image as ImageIcon, MousePointer2, Square, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as ImageProcessing from "@/lib/image-processing";

// ==================== 类型定义 ====================
export type AlgorithmType = "hybrid" | "texture" | "diffusion";
export type ToolType = "brush" | "rectangle" | "ellipse" | "polygon";
export type WatermarkType = "text" | "image";
export type Position = "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right";

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

export interface ProcessResult {
  result: string; // blob URL
  size: number;
}

// ==================== 水印编辑组件 ====================
interface WatermarkEditorProps {
  config: WatermarkConfig;
  onChange: (config: WatermarkConfig) => void;
}

export function WatermarkEditor({ config, onChange }: WatermarkEditorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="wm-position">位置</Label>
          <Select
            value={config.position || "bottom-right"}
            onValueChange={(v) => onChange({ ...config, position: v as Position })}
          >
            <SelectTrigger id="wm-position" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ImageProcessing.POSITION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="opacity">透明度: {config.opacity || 50}%</Label>
          <Slider
            id="opacity"
            min={10}
            max={100}
            step={5}
            value={[config.opacity || 50]}
            onValueChange={([v]) => onChange({ ...config, opacity: v })}
          />
        </div>
      </div>

      {config.type === "text" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="watermark-text">水印文字</Label>
            <input
              id="watermark-text"
              type="text"
              className="w-full px-3 py-2 text-sm border rounded-md"
              value={config.text || "VoidPix"}
              onChange={(e) => onChange({ ...config, text: e.target.value })}
              placeholder="输入水印文字"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="font-size">字体大小: {config.fontSize || 24}px</Label>
            <Slider
              id="font-size"
              min={12}
              max={72}
              step={2}
              value={[config.fontSize || 24]}
              onValueChange={([v]) => onChange({ ...config, fontSize: v })}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ==================== 去水印编辑组件 ====================
interface RemovalEditorProps {
  imagePreview: string;
  config: RemovalConfig & { tool: ToolType; brushSize: number };
  onConfigChange: (config: RemovalConfig & { tool: ToolType; brushSize: number }) => void;
  onHasMaskChange: (hasMask: boolean) => void;
}

const TOOL_OPTIONS = [
  { value: "brush", label: "画笔", icon: Eraser },
  { value: "rectangle", label: "矩形", icon: Square },
  { value: "ellipse", label: "椭圆", icon: Circle },
  { value: "polygon", label: "多边形", icon: MousePointer2 },
];

interface RemovalCanvasProps {
  imagePreview: string;
  config: RemovalConfig & { tool: ToolType; brushSize: number };
  onHasMaskChange: (hasMask: boolean) => void;
}

function RemovalCanvas({ imagePreview, config, onHasMaskChange }: RemovalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null);

  // 初始化canvas
  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    const canvas = canvasRef.current;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      const newMaskCanvas = document.createElement("canvas");
      newMaskCanvas.width = img.width;
      newMaskCanvas.height = img.height;
      const maskCtx = newMaskCanvas.getContext("2d");
      if (maskCtx) {
        maskCtx.fillStyle = "black";
        maskCtx.fillRect(0, 0, newMaskCanvas.width, newMaskCanvas.height);
      }

      setMaskCanvas(newMaskCanvas);

      // 通知父组件mask canvas已准备好
      onHasMaskChange(false);

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }

      setIsInitialized(true);
    };
    img.src = imagePreview;
  }, [imagePreview, isInitialized, onHasMaskChange]);

  // 重绘canvas
  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current || !maskCanvas) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx) {
        const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);
        let hasWhitePixels = false;
        for (let i = 0; i < maskData.data.length; i += 4) {
          if (maskData.data[i] > 128 || maskData.data[i + 1] > 128 || maskData.data[i + 2] > 128) {
            hasWhitePixels = true;
            break;
          }
        }
        if (hasWhitePixels) {
          const tempCtx = document.createElement("canvas").getContext("2d");
          if (tempCtx) {
            tempCtx.canvas.width = canvas.width;
            tempCtx.canvas.height = canvas.height;
            tempCtx.drawImage(maskCanvas, 0, 0);
            tempCtx.globalCompositeOperation = "source-in";
            tempCtx.fillStyle = "rgba(255, 0, 0, 0.5)";
            tempCtx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(tempCtx.canvas, 0, 0);
          }
        }
        onHasMaskChange(hasWhitePixels);
      }
    };
    img.src = imagePreview;
  }, [maskCanvas, imagePreview, onHasMaskChange]);

  useEffect(() => {
    if (isInitialized) {
      redrawCanvas();
    }
  }, [isInitialized, redrawCanvas]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!maskCanvas) return;
    const coords = getCanvasCoords(e);
    const tool = config.tool;

    if (tool === "polygon") return;

    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;

    if (tool === "brush") {
      maskCtx.lineWidth = config.brushSize;
      maskCtx.lineCap = "round";
      maskCtx.lineJoin = "round";
      maskCtx.strokeStyle = "white";
      maskCtx.beginPath();
      maskCtx.moveTo(coords.x, coords.y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!maskCanvas) return;
    const coords = getCanvasCoords(e);
    const tool = config.tool;

    if (tool === "polygon") return;

    const maskCtx = maskCanvas.getContext("2d");
    const canvas = canvasRef.current;
    if (!maskCtx || !canvas) return;

    if (tool === "brush") {
      maskCtx.lineTo(coords.x, coords.y);
      maskCtx.stroke();

      const tempCtx = document.createElement("canvas").getContext("2d");
      if (tempCtx) {
        tempCtx.canvas.width = canvas.width;
        tempCtx.canvas.height = canvas.height;
        tempCtx.drawImage(maskCanvas, 0, 0);
        tempCtx.globalCompositeOperation = "source-in";
        tempCtx.fillStyle = "rgba(255, 0, 0, 0.5)";
        tempCtx.fillRect(0, 0, canvas.width, canvas.height);

        const displayCtx = canvas.getContext("2d");
        if (displayCtx) {
          const img = new Image();
          img.onload = () => {
            displayCtx.drawImage(img, 0, 0);
            displayCtx.drawImage(tempCtx.canvas, 0, 0);
          };
          img.src = imagePreview;
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (!maskCanvas) return;
    const tool = config.tool;
    if (tool === "brush") {
      onHasMaskChange(true);
    }
  };

  // 监听config变化，更新maskCanvas引用
  useEffect(() => {
    if (maskCanvas) {
      onHasMaskChange(false);
    }
  }, [config.tool, config.brushSize]);

  return (
    <div className="border rounded bg-background p-1">
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <p className="text-xs text-muted-foreground mt-1">
        {config.tool === "brush" && "🖌️ 拖动鼠标绘制遮罩区域"}
        {config.tool === "rectangle" && "📐 拖拽选择矩形区域"}
        {config.tool === "ellipse" && "⚪ 拖拽选择椭圆区域"}
        {config.tool === "polygon" && "⬡ 点击添加点，双击完成"}
      </p>
    </div>
  );
}

interface RemovalEditorProps {
  imagePreview: string;
  config: RemovalConfig & { tool: ToolType; brushSize: number };
  onConfigChange: (config: RemovalConfig & { tool: ToolType; brushSize: number }) => void;
  onHasMaskChange: (hasMask: boolean) => void;
  onMaskCanvasReady: (maskCanvas: HTMLCanvasElement) => void;
}

export function RemovalEditor({ imagePreview, config, onConfigChange, onHasMaskChange, onMaskCanvasReady }: RemovalEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null);

  // 初始化canvas
  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    const canvas = canvasRef.current;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      const newMaskCanvas = document.createElement("canvas");
      newMaskCanvas.width = img.width;
      newMaskCanvas.height = img.height;
      const maskCtx = newMaskCanvas.getContext("2d");
      if (maskCtx) {
        maskCtx.fillStyle = "black";
        maskCtx.fillRect(0, 0, newMaskCanvas.width, newMaskCanvas.height);
      }

      setMaskCanvas(newMaskCanvas);
      onMaskCanvasReady(newMaskCanvas);
      onHasMaskChange(false);

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }

      setIsInitialized(true);
    };
    img.src = imagePreview;
  }, [imagePreview, isInitialized, onMaskCanvasReady, onHasMaskChange]);

  // 重绘canvas
  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current || !maskCanvas) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx) {
        const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);
        let hasWhitePixels = false;
        for (let i = 0; i < maskData.data.length; i += 4) {
          if (maskData.data[i] > 128 || maskData.data[i + 1] > 128 || maskData.data[i + 2] > 128) {
            hasWhitePixels = true;
            break;
          }
        }
        if (hasWhitePixels) {
          const tempCtx = document.createElement("canvas").getContext("2d");
          if (tempCtx) {
            tempCtx.canvas.width = canvas.width;
            tempCtx.canvas.height = canvas.height;
            tempCtx.drawImage(maskCanvas, 0, 0);
            tempCtx.globalCompositeOperation = "source-in";
            tempCtx.fillStyle = "rgba(255, 0, 0, 0.5)";
            tempCtx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(tempCtx.canvas, 0, 0);
          }
        }
        onHasMaskChange(hasWhitePixels);
      }
    };
    img.src = imagePreview;
  }, [maskCanvas, imagePreview, onHasMaskChange]);

  useEffect(() => {
    if (isInitialized) {
      redrawCanvas();
    }
  }, [isInitialized, redrawCanvas]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!maskCanvas) return;

    const coords = getCanvasCoords(e);
    const tool = config.tool;

    if (tool === "polygon") return;

    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;

    if (tool === "brush") {
      maskCtx.lineWidth = config.brushSize;
      maskCtx.lineCap = "round";
      maskCtx.lineJoin = "round";
      maskCtx.strokeStyle = "white";
      maskCtx.beginPath();
      maskCtx.moveTo(coords.x, coords.y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!maskCanvas) return;

    const coords = getCanvasCoords(e);
    const tool = config.tool;

    if (tool === "polygon") return;

    const maskCtx = maskCanvas.getContext("2d");
    const canvas = canvasRef.current;
    if (!maskCtx || !canvas) return;

    if (tool === "brush") {
      maskCtx.lineTo(coords.x, coords.y);
      maskCtx.stroke();

      const tempCtx = document.createElement("canvas").getContext("2d");
      if (tempCtx) {
        tempCtx.canvas.width = canvas.width;
        tempCtx.canvas.height = canvas.height;
        tempCtx.drawImage(maskCanvas, 0, 0);
        tempCtx.globalCompositeOperation = "source-in";
        tempCtx.fillStyle = "rgba(255, 0, 0, 0.5)";
        tempCtx.fillRect(0, 0, canvas.width, canvas.height);

        const displayCtx = canvas.getContext("2d");
        if (displayCtx) {
          const img = new Image();
          img.onload = () => {
            displayCtx.drawImage(img, 0, 0);
            displayCtx.drawImage(tempCtx.canvas, 0, 0);
          };
          img.src = imagePreview;
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (!maskCanvas) return;
    const tool = config.tool;
    if (tool === "brush") {
      onHasMaskChange(true);
    }
  };

  return (
    <div className="space-y-3">
      {/* 工具选择 */}
      <div className="grid grid-cols-4 gap-1">
        {TOOL_OPTIONS.map((tool) => (
          <Button
            key={tool.value}
            variant={config.tool === tool.value ? "default" : "outline"}
            size="sm"
            onClick={() => onConfigChange({ ...config, tool: tool.value as ToolType })}
            className="flex flex-col gap-1 h-auto py-1 px-1"
          >
            {tool.icon && <tool.icon className="h-3 w-3 mx-auto" />}
            <span className="text-xs">{tool.label}</span>
          </Button>
        ))}
      </div>

      {/* 算法选择 */}
      <Select
        value={config.algorithm}
        onValueChange={(v) => onConfigChange({ ...config, algorithm: v as AlgorithmType })}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="hybrid">混合模式（推荐）</SelectItem>
          <SelectItem value="texture">纹理合成</SelectItem>
          <SelectItem value="diffusion">扩散平滑</SelectItem>
        </SelectContent>
      </Select>

      {/* 参数调节 */}
      <div className="grid grid-cols-2 gap-2">
        {config.tool === "brush" && (
          <div className="space-y-1">
            <Label className="text-xs">画笔: {config.brushSize}px</Label>
            <Slider
              min={5}
              max={50}
              step={5}
              value={[config.brushSize]}
              onValueChange={([v]) => onConfigChange({ ...config, brushSize: v })}
            />
          </div>
        )}
        {config.algorithm !== "diffusion" && (
          <div className="space-y-1">
            <Label className="text-xs">块大小: {config.patchSize}</Label>
            <Slider
              min={5}
              max={15}
              step={2}
              value={[config.patchSize]}
              onValueChange={([v]) => onConfigChange({ ...config, patchSize: v })}
            />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">
            {config.algorithm === "texture"
              ? "快速模式"
              : `平滑度: ${config.algorithm === "diffusion" ? config.diffusionPasses * 5 : config.diffusionPasses}`}
          </Label>
          <Slider
            min={1}
            max={config.algorithm === "texture" ? 1 : 50}
            step={1}
            value={[config.algorithm === "texture" ? 1 : config.algorithm === "diffusion" ? config.diffusionPasses * 5 : config.diffusionPasses]}
            onValueChange={([v]) =>
              onConfigChange({
                ...config,
                diffusionPasses: config.algorithm === "diffusion" ? v / 5 : v
              })
            }
          />
        </div>
      </div>

      {/* 画布 */}
      <RemovalCanvas
        imagePreview={imagePreview}
        config={config}
        onHasMaskChange={onHasMaskChange}
      />
    </div>
  );
}
