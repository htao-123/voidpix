"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface ImageCompressorProps {
  imageFile: File | null;
  imagePreview: string | null;
}

export default function ImageCompressor({ imageFile, imagePreview }: ImageCompressorProps) {
  const [quality, setQuality] = useState([80]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);

  const handleCompress = async () => {
    if (!imagePreview) return;

    setIsCompressing(true);

    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setCompressedUrl(url);
            setOriginalSize(imageFile?.size || 0);
            setCompressedSize(blob.size);
          }
          setIsCompressing(false);
        }, "image/jpeg", quality[0] / 100);
      };
      img.src = imagePreview;
    } catch (error) {
      console.error("压缩失败:", error);
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!compressedUrl) return;

    const a = document.createElement("a");
    a.href = compressedUrl;
    a.download = `compressed_${quality[0]}%.jpg`;
    a.click();
  };

  const compressionRatio = originalSize > 0
    ? ((1 - compressedSize / originalSize) * 100).toFixed(1)
    : "0.0";

  return (
    <Card>
      <CardHeader>
        <CardTitle>图片压缩</CardTitle>
        <CardDescription>
          调整压缩质量以减小图片文件大小
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quality">压缩质量: {quality[0]}%</Label>
            <span className="text-sm text-muted-foreground">
              {quality[0] >= 80 ? "高质量" : quality[0] >= 50 ? "中等质量" : "高压缩"}
            </span>
          </div>
          <Slider
            id="quality"
            min={10}
            max={100}
            step={5}
            value={quality}
            onValueChange={setQuality}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>最小文件 (10%)</span>
            <span>最佳质量 (100%)</span>
          </div>
        </div>

        {compressedUrl && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">原始大小:</span>
                  <div className="font-medium text-lg">{(originalSize / 1024).toFixed(1)} KB</div>
                </div>
                <div>
                  <span className="text-muted-foreground">压缩后大小:</span>
                  <div className="font-medium text-lg">{(compressedSize / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">压缩率:</span>
                  <span className={`text-2xl font-bold ${parseFloat(compressionRatio) > 0 ? "text-green-600" : "text-red-600"}`}>
                    -{compressionRatio}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground text-sm">节省空间:</span>
                  <span className="font-medium">
                    {((originalSize - compressedSize) / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <img
                src={compressedUrl}
                alt="Compressed preview"
                className="max-h-48 max-w-full rounded-lg border border-border object-contain"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleCompress}
            disabled={isCompressing}
            className="flex-1"
          >
            {isCompressing ? "压缩中..." : "开始压缩"}
          </Button>
          {compressedUrl && (
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
