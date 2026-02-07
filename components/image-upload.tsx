"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ImageUploadProps {
  onImageSelect: (file: File, preview: string) => void;
}

export default function ImageUpload({ onImageSelect }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("请选择图片文件");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      onImageSelect(file, e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <Card
      className={`border-2 border-dashed transition-colors cursor-pointer ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => document.getElementById("file-input")?.click()}
    >
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">
          {isDragging ? "松开鼠标上传图片" : "点击或拖拽图片到这里"}
        </h3>
        <p className="text-sm text-muted-foreground">
          支持 JPG、PNG、WEBP 等常见格式
        </p>
        <Button className="mt-4" variant="outline">
          选择文件
        </Button>
      </div>
      <input
        id="file-input"
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleInputChange}
      />
    </Card>
  );
}
