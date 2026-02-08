"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { compress, EImageType } from "image-conversion";

interface FormatConverterProps {
  imageFile: File | null;
  imagePreview: string | null;
}

type ImageFormat = "png" | "jpeg" | "webp" | "bmp" | "ico";

const FORMAT_OPTIONS = [
  { value: "png", label: "PNG", description: "无损压缩，适合透明背景", mimeType: "image/png" },
  { value: "jpeg", label: "JPG", description: "有损压缩，文件更小", mimeType: "image/jpeg" },
  { value: "webp", label: "WEBP", description: "现代格式，体积更小", mimeType: "image/webp" },
  { value: "bmp", label: "BMP", description: "位图格式，无压缩", mimeType: "image/bmp" },
  { value: "ico", label: "ICO", description: "图标格式，用于网站favicon", mimeType: "image/x-icon" },
];

export default function FormatConverter({ imageFile, imagePreview }: FormatConverterProps) {
  const [selectedFormat, setSelectedFormat] = useState<ImageFormat>("png");
  const [isConverting, setIsConverting] = useState(false);
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [convertedSize, setConvertedSize] = useState(0);

  const handleConvert = async () => {
    if (!imageFile || !imagePreview) return;

    setIsConverting(true);

    try {
      const formatOption = FORMAT_OPTIONS.find(opt => opt.value === selectedFormat);
      if (!formatOption) return;

      // 对于 ICO 格式，使用特殊处理
      if (selectedFormat === "ico") {
        // 使用原生 Canvas 转换 ICO
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          // ICO 通常使用较小尺寸
          const size = Math.min(img.width, img.height, 256);
          canvas.width = size;
          canvas.height = size;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.drawImage(img, 0, 0, size, size);

          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              setConvertedUrl(url);
              setOriginalSize(imageFile?.size || 0);
              setConvertedSize(blob.size);
            }
            setIsConverting(false);
          }, formatOption.mimeType);
        };
        img.src = imagePreview;
      } else {
        // 使用 image-conversion 库转换其他格式
        const blob = await compress(imageFile, {
          quality: 0.92,
          type: formatOption.mimeType as EImageType,
        });
        const url = URL.createObjectURL(blob);
        setConvertedUrl(url);
        setOriginalSize(imageFile?.size || 0);
        setConvertedSize(blob.size);
        setIsConverting(false);
      }
    } catch (error) {
      console.error("转换失败:", error);
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!convertedUrl) return;

    const a = document.createElement("a");
    a.href = convertedUrl;
    const ext = selectedFormat === "jpeg" ? "jpg" : selectedFormat;
    a.download = `converted.${ext}`;
    a.click();
  };

  const formatOption = FORMAT_OPTIONS.find(opt => opt.value === selectedFormat);

  return (
    <Card>
      <CardHeader>
        <CardTitle>图片格式转换</CardTitle>
        <CardDescription>
          支持转换为 PNG、JPG、WEBP、BMP、ICO 等多种格式
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="format">目标格式</Label>
          <Select value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as ImageFormat)}>
            <SelectTrigger id="format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formatOption && (
            <p className="text-sm text-muted-foreground">{formatOption.description}</p>
          )}
        </div>

        {convertedUrl && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">原始大小:</span>
                  <span className="ml-2 font-medium">{(originalSize / 1024).toFixed(1)} KB</span>
                </div>
                <div>
                  <span className="text-muted-foreground">转换后大小:</span>
                  <span className="ml-2 font-medium">{(convertedSize / 1024).toFixed(1)} KB</span>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <span className="text-muted-foreground">大小变化:</span>
                <span className={`ml-2 font-medium ${
                  convertedSize < originalSize ? "text-green-600" : "text-red-600"
                }`}>
                  {convertedSize < originalSize ? "-" : "+"}
                  {Math.abs((convertedSize - originalSize) / originalSize * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <img
                src={convertedUrl}
                alt="Preview"
                className="max-h-48 max-w-full rounded-lg border border-border object-contain"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleConvert}
            disabled={isConverting}
            className="flex-1"
          >
            {isConverting ? "转换中..." : "开始转换"}
          </Button>
          {convertedUrl && (
            <Button onClick={handleDownload} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              下载
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
