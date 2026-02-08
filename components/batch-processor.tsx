"use client";

import { useState, useRef } from "react";
import { Upload, Download, X, Loader2, Check, Trash2 } from "lucide-react";
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
import JSZip from "jszip";
import * as ImageProcessing from "@/lib/image-processing";

// ==================== 类型定义 ====================
type ProcessType = "convert" | "compress";

interface ImageFile {
  file: File;
  preview: string;
  status: "pending" | "processing" | "completed" | "error";
  result?: string;
  error?: string;
  originalSize: number;
  processedSize?: number;
}

// ==================== 批量处理器主组件 ====================
interface BatchProcessorProps {
  images: ImageFile[];
  setImages: React.Dispatch<React.SetStateAction<ImageFile[]>>;
}

export default function BatchProcessor({ images, setImages }: BatchProcessorProps) {
  const [processType, setProcessType] = useState<ProcessType>("convert");
  const [convertFormat, setConvertFormat] = useState<ImageProcessing.ImageFormat>("jpeg");
  const [quality, setQuality] = useState([80]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages: ImageFile[] = [];

    files.forEach(file => {
      if (file.type.startsWith("image/")) {
        const preview = URL.createObjectURL(file);
        newImages.push({
          file,
          preview,
          status: "pending",
          originalSize: file.size,
        });
      }
    });

    setImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      const img = newImages[index];
      if (img.preview) URL.revokeObjectURL(img.preview);
      if (img.result) URL.revokeObjectURL(img.result);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const clearAll = () => {
    images.forEach(img => {
      if (img.preview) URL.revokeObjectURL(img.preview);
      if (img.result) URL.revokeObjectURL(img.result);
    });
    setImages([]);
    setProcessedCount(0);
  };

  // 处理单张图片
  const processImage = async (imageFile: ImageFile): Promise<{ result: string; size: number }> => {
    switch (processType) {
      case "convert": {
        const { blob, url } = await ImageProcessing.convertImageFormat(imageFile.file, convertFormat, 0.92);
        return { result: url, size: blob.size };
      }

      case "compress": {
        const { blob, url } = await ImageProcessing.compressImage(imageFile.file, quality[0]);
        return { result: url, size: blob.size };
      }

      default:
        throw new Error("未知的处理类型");
    }
  };

  const processAll = async () => {
    setIsProcessing(true);
    setProcessedCount(0);

    for (let i = 0; i < images.length; i++) {
      setImages(prev => {
        const newImages = [...prev];
        newImages[i].status = "processing";
        return newImages;
      });

      try {
        const { result, size } = await processImage(images[i]);
        setImages(prev => {
          const newImages = [...prev];
          newImages[i].status = "completed";
          newImages[i].result = result;
          newImages[i].processedSize = size;
          return newImages;
        });
      } catch (error) {
        setImages(prev => {
          const newImages = [...prev];
          newImages[i].status = "error";
          newImages[i].error = error instanceof Error ? error.message : "处理失败";
          return newImages;
        });
      }

      setProcessedCount(i + 1);
    }

    setIsProcessing(false);
  };

  const downloadSingle = (index: number) => {
    const image = images[index];
    if (!image.result) return;

    const a = document.createElement("a");
    a.href = image.result;
    const extension = ImageProcessing.getFileExtension(convertFormat);
    // 保留原始文件扩展名以确保唯一性
    const originalName = image.file.name.replace(/\.[^/.]+$/, "");
    const originalExt = image.file.name.split('.').pop() || '';
    a.download = `${originalName}.${originalExt}_processed.${extension}`;
    a.click();
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    const extension = ImageProcessing.getFileExtension(convertFormat);

    // 用于跟踪文件名冲突，添加序号后缀
    const fileNameCount = new Map<string, number>();

    const promises = images
      .filter(image => image.result)
      .map(async (image) => {
        // 保留原始文件扩展名以确保唯一性
        const originalName = image.file.name.replace(/\.[^/.]+$/, "");
        const originalExt = image.file.name.split('.').pop() || '';
        // 格式：原文件名.原扩展名_processed.新扩展名
        // 例如：photo.jpg_processed.jpeg
        const baseFileName = `${originalName}.${originalExt}_processed`;

        // 检查是否有重复文件名
        let finalFileName = `${baseFileName}.${extension}`;
        const count = fileNameCount.get(baseFileName) || 0;
        if (count > 0) {
          finalFileName = `${baseFileName}_${count}.${extension}`;
        }
        fileNameCount.set(baseFileName, count + 1);

        const response = await fetch(image.result!);
        const blob = await response.blob();
        zip.file(finalFileName, blob);
      });

    await Promise.all(promises);

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voidpix_batch_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };


  const getFormatDescription = (format: ImageProcessing.ImageFormat) => {
    const option = ImageProcessing.FORMAT_OPTIONS.find(opt => opt.value === format);
    return option?.description || "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>批量处理图片</CardTitle>
        <CardDescription>
          一次性处理多张图片，支持格式转换和压缩
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Upload className="mr-2 h-4 w-4" />
              选择图片
            </Button>
            {images.length > 0 && (
              <Button variant="outline" onClick={clearAll}>
                <Trash2 className="mr-2 h-4 w-4" />
                清空
              </Button>
            )}
          </div>

          {images.length > 0 && (
            <p className="text-sm text-muted-foreground">
              已选择 {images.length} 张图片
            </p>
          )}
        </div>

        {/* Settings */}
        {images.length > 0 && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="process-type">处理类型</Label>
                <Select value={processType} onValueChange={(v) => setProcessType(v as ProcessType)}>
                  <SelectTrigger id="process-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="convert">格式转换</SelectItem>
                    <SelectItem value="compress">图片压缩</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {processType === "convert" && (
                <div className="space-y-2">
                  <Label htmlFor="format">目标格式</Label>
                  <Select value={convertFormat} onValueChange={(v) => setConvertFormat(v as ImageProcessing.ImageFormat)}>
                    <SelectTrigger id="format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ImageProcessing.FORMAT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {convertFormat && (
                    <p className="text-xs text-muted-foreground">{getFormatDescription(convertFormat)}</p>
                  )}
                </div>
              )}
            </div>

            {/* 质量设置 - 仅压缩时显示 */}
            {processType === "compress" && (
              <div className="space-y-2">
                <Label htmlFor="quality">质量: {quality[0]}%</Label>
                <Slider
                  id="quality"
                  min={10}
                  max={100}
                  step={5}
                  value={quality}
                  onValueChange={setQuality}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>最小文件</span>
                  <span>{quality[0] >= 80 ? "高质量" : quality[0] >= 50 ? "中等质量" : "高压缩"}</span>
                  <span>最佳质量</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Image List */}
        {images.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {images.map((image, index) => (
                <ImageCard
                  key={index}
                  image={image}
                  index={index}
                  isProcessing={isProcessing}
                  onRemove={removeImage}
                  onDownload={downloadSingle}
                />
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {images.length > 0 && (
          <div className="flex gap-2 border-t pt-4">
            <Button
              onClick={processAll}
              disabled={isProcessing || images.length === 0}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中... ({processedCount}/{images.length})
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  开始处理
                </>
              )}
            </Button>

            {images.some(img => img.status === "completed") && (
              <Button
                onClick={downloadAll}
                variant="outline"
                disabled={isProcessing}
              >
                <Download className="mr-2 h-4 w-4" />
                打包下载全部
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== 图片卡片组件 ====================
interface ImageCardProps {
  image: ImageFile;
  index: number;
  isProcessing: boolean;
  onRemove: (index: number) => void;
  onDownload: (index: number) => void;
}

function ImageCard({
  image,
  index,
  isProcessing,
  onRemove,
  onDownload,
}: ImageCardProps) {
  return (
    <div
      className={`relative border rounded-lg p-2 transition-colors ${
        image.status === "completed" ? "border-green-500 bg-green-50 dark:bg-green-950/20" :
        image.status === "error" ? "border-red-500 bg-red-50 dark:bg-red-950/20" :
        image.status === "processing" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" :
        "border-border"
      }`}
    >
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80 hover:bg-background z-10"
        onClick={() => onRemove(index)}
        disabled={isProcessing}
      >
        <X className="h-3 w-3" />
      </Button>

      <div className="aspect-video bg-muted rounded flex items-center justify-center overflow-hidden">
        <img
          src={image.preview}
          alt={image.file.name}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      <div className="mt-2 space-y-2">
        <p className="text-xs font-medium truncate">{image.file.name}</p>
        <p className="text-xs text-muted-foreground">
          {ImageProcessing.formatSize(image.originalSize)}
          {image.processedSize && (
            <span className="text-green-600 dark:text-green-400">
              {" → "}{ImageProcessing.formatSize(image.processedSize)}
              {image.originalSize > image.processedSize && (
                <span className="ml-1">
                  (-{Math.round((1 - image.processedSize / image.originalSize) * 100)}%)
                </span>
              )}
            </span>
          )}
        </p>

        {/* 状态显示 */}
        <div className="flex items-center gap-1">
          {image.status === "pending" && (
            <span className="text-xs text-muted-foreground">等待处理</span>
          )}
          {image.status === "processing" && (
            <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              处理中
            </span>
          )}
          {image.status === "completed" && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <Check className="h-3 w-3" />
              已完成
            </span>
          )}
          {image.status === "error" && (
            <span className="text-xs text-red-600 dark:text-red-400" title={image.error}>
              处理失败
            </span>
          )}
        </div>

        {image.status === "completed" && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => onDownload(index)}
          >
            <Download className="mr-1 h-3 w-3" />
            下载
          </Button>
        )}
      </div>
    </div>
  );
}
