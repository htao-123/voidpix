"use client";

import { useState, useRef, useEffect } from "react";
import { Download } from "lucide-react";
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
type Position = "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right";

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
];

export default function AddWatermark({ imageFile, imagePreview }: AddWatermarkProps) {
  const [watermarkType, setWatermarkType] = useState<WatermarkType>("text");
  const [text, setText] = useState("VoidPix");
  const [fontSize, setFontSize] = useState([24]);
  const [opacity, setOpacity] = useState([50]);
  const [position, setPosition] = useState<Position>("bottom-right");
  const [watermarkImage, setWatermarkImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (imagePreview) {
      generatePreview();
    }
  }, [imagePreview, watermarkType, text, fontSize, opacity, position, watermarkImage]);

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

      // 设置透明度和样式
      ctx.globalAlpha = opacity[0] / 100;

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
    const fontSizeValue = Math.max(fontSize[0], Math.floor(width / 30));
    ctx.font = `bold ${fontSizeValue}px Arial, sans-serif`;
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = fontSizeValue / 20;

    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSizeValue;
    const padding = fontSizeValue;

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
  };

  const drawImageWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number, originalImage: HTMLImageElement) => {
    const wmImg = new Image();
    wmImg.onload = () => {
      // 计算水印大小 (图片宽度的 1/5)
      const wmWidth = Math.max(width / 5, 50);
      const wmHeight = (wmImg.height / wmImg.width) * wmWidth;

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
      setPreviewUrl(ctx.canvas.toDataURL("image/png"));
    };
    wmImg.src = URL.createObjectURL(watermarkImage);
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
          为图片添加文字或图片水印
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        {watermarkType === "text" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="watermark-text">水印文字</Label>
              <Input
                id="watermark-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="输入水印文字"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="font-size">字体大小: {fontSize[0]}px</Label>
              <Slider
                id="font-size"
                min={12}
                max={72}
                step={2}
                value={fontSize}
                onValueChange={setFontSize}
              />
            </div>
          </div>
        ) : (
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

        <div className="space-y-2">
          <Label htmlFor="position">水印位置</Label>
          <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
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

        <div className="space-y-2">
          <Label htmlFor="opacity">透明度: {opacity[0]}%</Label>
          <Slider
            id="opacity"
            min={10}
            max={100}
            step={5}
            value={opacity}
            onValueChange={setOpacity}
          />
        </div>

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

        <Button onClick={handleDownload} disabled={!previewUrl} className="w-full">
          <Download className="mr-2 h-4 w-4" />
          下载带水印的图片
        </Button>
      </CardContent>
    </Card>
  );
}
