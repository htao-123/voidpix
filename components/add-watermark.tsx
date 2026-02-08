"use client";

import { useState, useRef, useEffect } from "react";
import { Download, Sparkles, Type, Palette, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddWatermarkProps {
  imageFile: File | null;
  imagePreview: string | null;
}

type WatermarkType = "text" | "image";
type Position = "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right" | "tiled";
type BlendMode = "source-over" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion";
type FontWeight = "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";

interface WatermarkPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<WatermarkConfig>;
}

interface WatermarkConfig {
  text: string;
  fontSize: number;
  opacity: number;
  position: Position;
  rotation: number;
  textColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  fontFamily: string;
  fontWeight: FontWeight;
  letterSpacing: number;
  blendMode: BlendMode;
  tiledDensity: number;
  tiledRotation: number;
}

const POSITION_OPTIONS = [
  { value: "top-left", label: "左上" },
  { value: "top-center", label: "上中" },
  { value: "top-right", label: "右上" },
  { value: "center-left", label: "左中" },
  { value: "center", label: "中心" },
  { value: "center-right", label: "右中" },
  { value: "bottom-left", label: "左下" },
  { value: "bottom-center", label: "下中" },
  { value: "bottom-right", label: "右下" },
  { value: "tiled", label: "平铺全图" },
];

const FONT_FAMILY_OPTIONS = [
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Times New Roman, serif", label: "Times New Roman" },
  { value: "Courier New, monospace", label: "Courier New" },
  { value: "Verdana, sans-serif", label: "Verdana" },
  { value: "Impact, sans-serif", label: "Impact" },
  { value: "Comic Sans MS, cursive", label: "Comic Sans" },
  { value: "Trebuchet MS, sans-serif", label: "Trebuchet MS" },
];

const BLEND_MODE_OPTIONS = [
  { value: "source-over", label: "正常" },
  { value: "multiply", label: "正片叠底" },
  { value: "screen", label: "滤色" },
  { value: "overlay", label: "叠加" },
  { value: "darken", label: "变暗" },
  { value: "lighten", label: "变亮" },
  { value: "color-dodge", label: "颜色减淡" },
  { value: "color-burn", label: "颜色加深" },
  { value: "hard-light", label: "强光" },
  { value: "soft-light", label: "柔光" },
  { value: "difference", label: "差值" },
  { value: "exclusion", label: "排除" },
];

const PRESETS: WatermarkPreset[] = [
  {
    id: "subtle",
    name: "低调",
    description: "轻微透明，适合日常分享",
    config: { opacity: 30, fontSize: 16, textColor: "#FFFFFF", strokeColor: "#000000", strokeWidth: 1, position: "bottom-right", blendMode: "source-over" },
  },
  {
    id: "bold",
    name: "醒目",
    description: "清晰可见，版权保护",
    config: { opacity: 80, fontSize: 32, textColor: "#FFFFFF", strokeColor: "#000000", strokeWidth: 3, position: "center", blendMode: "source-over" },
  },
  {
    id: "professional",
    name: "专业",
    description: "精致样式，商务场景",
    config: { opacity: 60, fontSize: 24, textColor: "#FFFFFF", strokeColor: "#000000", strokeWidth: 2, shadowEnabled: true, shadowBlur: 4, position: "bottom-right", blendMode: "overlay" },
  },
  {
    id: "tiled-light",
    name: "平铺淡雅",
    description: "全图平铺，保护性强",
    config: { opacity: 20, fontSize: 20, textColor: "#FFFFFF", strokeColor: "#000000", strokeWidth: 1, position: "tiled", tiledDensity: 3, tiledRotation: -30, blendMode: "source-over" },
  },
  {
    id: "diagonal",
    name: "对角线",
    description: "45度倾斜，现代风格",
    config: { opacity: 50, fontSize: 28, textColor: "#FFFFFF", strokeColor: "#000000", strokeWidth: 2, rotation: -45, position: "center", blendMode: "source-over" },
  },
];

const DEFAULT_CONFIG: WatermarkConfig = {
  text: "VoidPix",
  fontSize: 24,
  opacity: 50,
  position: "bottom-right",
  rotation: 0,
  textColor: "#FFFFFF",
  strokeColor: "#000000",
  strokeWidth: 2,
  shadowEnabled: false,
  shadowColor: "#000000",
  shadowBlur: 4,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  fontFamily: "Arial, sans-serif",
  fontWeight: "bold",
  letterSpacing: 0,
  blendMode: "source-over",
  tiledDensity: 3,
  tiledRotation: -30,
};

export default function AddWatermark({ imageFile, imagePreview }: AddWatermarkProps) {
  const [watermarkType, setWatermarkType] = useState<WatermarkType>("text");
  const [config, setConfig] = useState<WatermarkConfig>(DEFAULT_CONFIG);
  const [watermarkImage, setWatermarkImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (imagePreview) {
      generatePreview();
    }
  }, [imagePreview, watermarkType, config, watermarkImage]);

  const updateConfig = (updates: Partial<WatermarkConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const applyPreset = (preset: WatermarkPreset) => {
    setConfig(prev => ({ ...prev, ...preset.config }));
  };

  const generatePreview = () => {
    if (!imagePreview) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      // 设置透明度和混合模式
      ctx.globalAlpha = config.opacity / 100;
      ctx.globalCompositeOperation = config.blendMode;

      if (watermarkType === "text") {
        drawTextWatermark(ctx, canvas.width, canvas.height);
      } else if (watermarkType === "image" && watermarkImage) {
        drawImageWatermark(ctx, canvas.width, canvas.height, img);
      }

      setPreviewUrl(canvas.toDataURL("image/png"));
    };
    img.src = imagePreview;
  };

  const drawTextWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const fontSizeValue = Math.max(config.fontSize, Math.floor(width / 30));
    ctx.font = `${config.fontWeight} ${fontSizeValue}px ${config.fontFamily}`;
    ctx.fillStyle = config.textColor;
    ctx.strokeStyle = config.strokeColor;
    ctx.lineWidth = config.strokeWidth;

    // 设置阴影
    if (config.shadowEnabled) {
      ctx.shadowColor = config.shadowColor;
      ctx.shadowBlur = config.shadowBlur;
      ctx.shadowOffsetX = config.shadowOffsetX;
      ctx.shadowOffsetY = config.shadowOffsetY;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // 设置字间距
    if (config.letterSpacing > 0) {
      ctx.letterSpacing = `${config.letterSpacing}px`;
    }

    const textMetrics = ctx.measureText(config.text);
    const textWidth = textMetrics.width;
    const textHeight = fontSizeValue;
    const padding = fontSizeValue;

    if (config.position === "tiled") {
      // 平铺模式
      drawTiledWatermark(ctx, width, height, fontSizeValue);
    } else {
      // 单个位置模式
      drawSingleWatermark(ctx, width, height, textWidth, textHeight, padding);
    }
  };

  const drawTiledWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number, fontSizeValue: number) => {
    const textMetrics = ctx.measureText(config.text);
    const textWidth = textMetrics.width + config.letterSpacing * config.text.length;
    const textHeight = fontSizeValue * 1.5;

    // 计算平铺间距
    const spacingX = textWidth + config.fontSize * config.tiledDensity;
    const spacingY = textHeight + config.fontSize * config.tiledDensity;

    // 保存状态
    ctx.save();

    // 计算对角线长度，确保旋转后覆盖整个画布
    const diagonal = Math.sqrt(width * width + height * height);

    // 创建临时画布进行旋转
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = diagonal;
    tempCanvas.height = diagonal;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) {
      ctx.restore();
      return;
    }

    // 设置临时画布的样式
    tempCtx.font = ctx.font;
    tempCtx.fillStyle = ctx.fillStyle;
    tempCtx.strokeStyle = ctx.strokeStyle;
    tempCtx.lineWidth = ctx.lineWidth;
    tempCtx.shadowColor = ctx.shadowColor;
    tempCtx.shadowBlur = ctx.shadowBlur;
    tempCtx.shadowOffsetX = ctx.shadowOffsetX;
    tempCtx.shadowOffsetY = ctx.shadowOffsetY;
    if (config.letterSpacing > 0) {
      tempCtx.letterSpacing = `${config.letterSpacing}px`;
    }

    // 计算平铺行列数
    const cols = Math.ceil(diagonal / spacingX) + 2;
    const rows = Math.ceil(diagonal / spacingY) + 2;

    // 在临时画布上绘制平铺水印
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const x = col * spacingX;
        const y = row * spacingY + textHeight;

        if (config.strokeWidth > 0) {
          tempCtx.strokeText(config.text, x, y);
        }
        tempCtx.fillText(config.text, x, y);
      }
    }

    // 旋转临时画布并绘制到主画布
    ctx.save();
    ctx.translate((width - diagonal) / 2, (height - diagonal) / 2);
    ctx.rotate((config.tiledRotation * Math.PI) / 180);
    ctx.translate(-diagonal / 2, -diagonal / 2);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();

    ctx.restore();
  };

  const drawSingleWatermark = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    textWidth: number,
    textHeight: number,
    padding: number
  ) => {
    let x = padding;
    let y = padding + textHeight;

    switch (config.position) {
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

    ctx.save();

    // 应用旋转
    if (config.rotation !== 0) {
      ctx.translate(x + textWidth / 2, y - textHeight / 2);
      ctx.rotate((config.rotation * Math.PI) / 180);
      ctx.translate(-(x + textWidth / 2), -(y - textHeight / 2));
    }

    if (config.strokeWidth > 0) {
      ctx.strokeText(config.text, x, y);
    }
    ctx.fillText(config.text, x, y);

    ctx.restore();
  };

  const drawImageWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number, originalImage: HTMLImageElement) => {
    const wmImg = new Image();
    wmImg.onload = () => {
      // 计算水印大小 (图片宽度的 1/5)
      const wmWidth = Math.max(width / 5, 50);
      const wmHeight = (wmImg.height / wmImg.width) * wmWidth;

      let x = 20;
      let y = 20;

      switch (config.position) {
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
        case "tiled":
          // 图片水印平铺模式
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = width;
          tempCanvas.height = height;
          const tempCtx = tempCanvas.getContext("2d");
          if (!tempCtx) return;

          const tileSpacing = wmWidth + 20;
          const cols = Math.ceil(width / tileSpacing) + 1;
          const rows = Math.ceil(height / ((wmHeight + 20) * 1.5)) + 1;

          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const offsetX = (row % 2) * (tileSpacing / 2);
              const posX = col * tileSpacing + offsetX - wmWidth / 2;
              const posY = row * (wmHeight + 20) * 1.5;
              tempCtx.drawImage(wmImg, posX, posY, wmWidth, wmHeight);
            }
          }

          ctx.drawImage(tempCanvas, 0, 0);
          setPreviewUrl(ctx.canvas.toDataURL("image/png"));
          return;
      }

      ctx.drawImage(wmImg, x, y, wmWidth, wmHeight);
      setPreviewUrl(ctx.canvas.toDataURL("image/png"));
    };
    if (watermarkImage) {
      wmImg.src = URL.createObjectURL(watermarkImage);
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;

    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `watermarked.${imageFile?.name.split(".").pop() || "png"}`;
    a.click();
  };

  const handleWatermarkImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWatermarkImage(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>添加水印</CardTitle>
        <CardDescription>
          为图片添加文字或图片水印，支持多种样式效果
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 水印类型选择 */}
        <div className="space-y-2">
          <Label htmlFor="watermark-type">水印类型</Label>
          <Select value={watermarkType} onValueChange={(v) => setWatermarkType(v as WatermarkType)}>
            <SelectTrigger id="watermark-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">文字水印</SelectItem>
              <SelectItem value="image">图片水印</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 快速预设 */}
        {watermarkType === "text" && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              快速预设
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="h-auto flex-col py-2 px-3 text-left"
                >
                  <div className="font-medium text-xs">{preset.name}</div>
                  <div className="text-[10px] text-muted-foreground">{preset.description}</div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 文字水印设置 */}
        {watermarkType === "text" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="watermark-text">水印文字</Label>
              <Input
                id="watermark-text"
                value={config.text}
                onChange={(e) => updateConfig({ text: e.target.value })}
                placeholder="输入水印文字"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="font-size">字体大小: {config.fontSize}px</Label>
              <Slider
                id="font-size"
                min={12}
                max={72}
                step={2}
                value={[config.fontSize]}
                onValueChange={([v]) => updateConfig({ fontSize: v })}
              />
            </div>

            {/* 字体选择 */}
            <div className="space-y-2">
              <Label htmlFor="font-family">字体</Label>
              <Select value={config.fontFamily} onValueChange={(v) => updateConfig({ fontFamily: v })}>
                <SelectTrigger id="font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 颜色设置 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="text-color">文字颜色</Label>
                <div className="flex gap-2">
                  <Input
                    id="text-color"
                    type="color"
                    value={config.textColor}
                    onChange={(e) => updateConfig({ textColor: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={config.textColor}
                    onChange={(e) => updateConfig({ textColor: e.target.value })}
                    className="flex-1"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stroke-color">描边颜色</Label>
                <div className="flex gap-2">
                  <Input
                    id="stroke-color"
                    type="color"
                    value={config.strokeColor}
                    onChange={(e) => updateConfig({ strokeColor: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={config.strokeColor}
                    onChange={(e) => updateConfig({ strokeColor: e.target.value })}
                    className="flex-1"
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>

            {/* 描边宽度 */}
            <div className="space-y-2">
              <Label htmlFor="stroke-width">描边宽度: {config.strokeWidth}px</Label>
              <Slider
                id="stroke-width"
                min={0}
                max={10}
                step={0.5}
                value={[config.strokeWidth]}
                onValueChange={([v]) => updateConfig({ strokeWidth: v })}
              />
            </div>

            {/* 高级选项开关 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full"
            >
              {showAdvanced ? "隐藏" : "显示"}高级选项
            </Button>

            {/* 高级选项 */}
            {showAdvanced && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                {/* 旋转角度 */}
                <div className="space-y-2">
                  <Label htmlFor="rotation">旋转角度: {config.rotation}°</Label>
                  <Slider
                    id="rotation"
                    min={-180}
                    max={180}
                    step={5}
                    value={[config.rotation]}
                    onValueChange={([v]) => updateConfig({ rotation: v })}
                  />
                </div>

                {/* 字间距 */}
                <div className="space-y-2">
                  <Label htmlFor="letter-spacing">字间距: {config.letterSpacing}px</Label>
                  <Slider
                    id="letter-spacing"
                    min={0}
                    max={20}
                    step={1}
                    value={[config.letterSpacing]}
                    onValueChange={([v]) => updateConfig({ letterSpacing: v })}
                  />
                </div>

                {/* 混合模式 */}
                <div className="space-y-2">
                  <Label htmlFor="blend-mode">混合模式</Label>
                  <Select value={config.blendMode} onValueChange={(v) => updateConfig({ blendMode: v as BlendMode })}>
                    <SelectTrigger id="blend-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLEND_MODE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 阴影效果 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="shadow-enabled">阴影效果</Label>
                    <input
                      id="shadow-enabled"
                      type="checkbox"
                      checked={config.shadowEnabled}
                      onChange={(e) => updateConfig({ shadowEnabled: e.target.checked })}
                      className="w-4 h-4"
                    />
                  </div>

                  {config.shadowEnabled && (
                    <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Label htmlFor="shadow-color" className="text-xs">阴影颜色</Label>
                          <Input
                            id="shadow-color"
                            type="color"
                            value={config.shadowColor}
                            onChange={(e) => updateConfig({ shadowColor: e.target.value })}
                            className="w-full h-8 p-1"
                          />
                        </div>
                        <div className="flex-1">
                          <Label htmlFor="shadow-blur" className="text-xs">模糊: {config.shadowBlur}</Label>
                          <Slider
                            id="shadow-blur"
                            min={0}
                            max={20}
                            step={1}
                            value={[config.shadowBlur]}
                            onValueChange={([v]) => updateConfig({ shadowBlur: v })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="shadow-offset-x" className="text-xs">X偏移: {config.shadowOffsetX}</Label>
                          <Slider
                            id="shadow-offset-x"
                            min={-10}
                            max={10}
                            step={1}
                            value={[config.shadowOffsetX]}
                            onValueChange={([v]) => updateConfig({ shadowOffsetX: v })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="shadow-offset-y" className="text-xs">Y偏移: {config.shadowOffsetY}</Label>
                          <Slider
                            id="shadow-offset-y"
                            min={-10}
                            max={10}
                            step={1}
                            value={[config.shadowOffsetY]}
                            onValueChange={([v]) => updateConfig({ shadowOffsetY: v })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 平铺模式设置 */}
                {config.position === "tiled" && (
                  <div className="space-y-3 pt-3 border-t">
                    <Label className="text-xs font-medium">平铺设置</Label>
                    <div className="space-y-2">
                      <Label htmlFor="tiled-density" className="text-xs">密度: {config.tiledDensity}</Label>
                      <Slider
                        id="tiled-density"
                        min={1}
                        max={10}
                        step={1}
                        value={[config.tiledDensity]}
                        onValueChange={([v]) => updateConfig({ tiledDensity: v })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tiled-rotation" className="text-xs">倾斜角度: {config.tiledRotation}°</Label>
                      <Slider
                        id="tiled-rotation"
                        min={-90}
                        max={90}
                        step={5}
                        value={[config.tiledRotation]}
                        onValueChange={([v]) => updateConfig({ tiledRotation: v })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* 图片水印设置 */
          <div className="space-y-2">
            <Label htmlFor="watermark-image">水印图片</Label>
            <Input
              id="watermark-image"
              type="file"
              accept="image/*"
              onChange={handleWatermarkImageChange}
            />
            <p className="text-xs text-muted-foreground">
              支持 PNG 透明背景图片效果最佳
            </p>
          </div>
        )}

        {/* 位置选择 */}
        <div className="space-y-2">
          <Label htmlFor="position">水印位置</Label>
          <Select value={config.position} onValueChange={(v) => updateConfig({ position: v as Position })}>
            <SelectTrigger id="position">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 透明度 */}
        <div className="space-y-2">
          <Label htmlFor="opacity">透明度: {config.opacity}%</Label>
          <Slider
            id="opacity"
            min={10}
            max={100}
            step={5}
            value={[config.opacity]}
            onValueChange={([v]) => updateConfig({ opacity: v })}
          />
        </div>

        {/* 预览 */}
        {previewUrl && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground mb-2">预览效果</div>
              <img
                src={previewUrl}
                alt="Watermarked preview"
                className="max-h-48 max-w-full rounded-lg object-contain mx-auto"
              />
            </div>
          </div>
        )}

        {/* 下载按钮 */}
        <Button onClick={handleDownload} disabled={!previewUrl} className="w-full">
          <Download className="mr-2 h-4 w-4" />
          下载带水印的图片
        </Button>
      </CardContent>
    </Card>
  );
}
