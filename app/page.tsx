"use client";

import { useState } from "react";
import { Upload, Image as ImageIcon, Download, Sparkles, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import ImageUpload from "@/components/image-upload";
import FormatConverter from "@/components/format-converter";
import ImageCompressor from "@/components/image-compressor";
import AddWatermark from "@/components/add-watermark";
import RemoveWatermark from "@/components/remove-watermark";
import BatchProcessor from "@/components/batch-processor";

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"single" | "batch">("single");
  // 批量处理的图片列表状态，提升到父组件以保持状态
  const [batchImages, setBatchImages] = useState<any[]>([]);

  const handleImageSelect = (file: File, preview: string) => {
    setImageFile(file);
    setSelectedImage(preview);
  };

  const handleImageClear = () => {
    setImageFile(null);
    setSelectedImage(null);
  };

  const handleModeChange = (newMode: "single" | "batch") => {
    setMode(newMode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold leading-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                VoidPix
              </h1>
              <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">
                专业图片处理工具
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground hidden md:block">
              全本地处理 · 隐私安全
            </p>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Mode Selection */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg border p-1 bg-background">
            <Button
              variant={mode === "single" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleModeChange("single")}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              单张处理
            </Button>
            <Button
              variant={mode === "batch" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleModeChange("batch")}
            >
              <Layers className="mr-2 h-4 w-4" />
              批量处理
            </Button>
          </div>
        </div>

        {mode === "single" ? (
          !selectedImage ? (
          // Upload Section
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-2xl border-2 border-dashed hover:border-primary/50 transition-colors">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
                  <ImageIcon className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  上传图片开始处理
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  支持 JPG、PNG、WEBP 等常见格式，所有处理均在本地完成
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload onImageSelect={handleImageSelect} />
              </CardContent>
            </Card>

            {/* Features */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl">
              <Card className="text-center group hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 transition-shadow">
                    <Upload className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-1 text-base">格式转换</h3>
                  <p className="text-sm text-muted-foreground">JPG、PNG、WEBP 等格式互转</p>
                </CardContent>
              </Card>

              <Card className="text-center group hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/20 group-hover:shadow-green-500/30 transition-shadow">
                    <Download className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-1 text-base">图片压缩</h3>
                  <p className="text-sm text-muted-foreground">智能压缩减小文件大小</p>
                </CardContent>
              </Card>

              <Card className="text-center group hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/30 transition-shadow">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-1 text-base">添加水印</h3>
                  <p className="text-sm text-muted-foreground">支持文字和图片水印</p>
                </CardContent>
              </Card>

              <Card className="text-center group hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/30 transition-shadow">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-1 text-base">去除水印</h3>
                  <p className="text-sm text-muted-foreground">智能算法去除水印</p>
                </CardContent>
              </Card>
            </div>

            {/* Privacy Notice */}
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-3 rounded-full">
              <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>所有处理均在浏览器本地完成，图片不会上传到任何服务器</span>
            </div>
          </div>
        ) : (
          // Tools Section
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>图片已加载</CardTitle>
                    <CardDescription>
                      {imageFile?.name} ({((imageFile?.size || 0) / 1024).toFixed(1)} KB)
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={handleImageClear}>
                    更换图片
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="max-h-64 max-w-full rounded-lg border border-border object-contain"
                  />
                </div>
              </CardContent>
            </Card>

            <Separator />

            <Tabs defaultValue="convert" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="convert">格式转换</TabsTrigger>
                <TabsTrigger value="compress">图片压缩</TabsTrigger>
                <TabsTrigger value="add-watermark">添加水印</TabsTrigger>
                <TabsTrigger value="remove-watermark">去除水印</TabsTrigger>
              </TabsList>

              <TabsContent value="convert" className="mt-6">
                <FormatConverter imageFile={imageFile} imagePreview={selectedImage} />
              </TabsContent>

              <TabsContent value="compress" className="mt-6">
                <ImageCompressor imageFile={imageFile} imagePreview={selectedImage} />
              </TabsContent>

              <TabsContent value="add-watermark" className="mt-6">
                <AddWatermark imageFile={imageFile} imagePreview={selectedImage} />
              </TabsContent>

              <TabsContent value="remove-watermark" className="mt-6">
                <RemoveWatermark imagePreview={selectedImage} />
              </TabsContent>
            </Tabs>
          </div>
        )) : (
          // Batch Processing Mode
          <BatchProcessor
            images={batchImages}
            setImages={setBatchImages}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/40 bg-muted/30 backdrop-blur">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-semibold">VoidPix</span>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <span>格式转换</span>
              <span>•</span>
              <span>图片压缩</span>
              <span>•</span>
              <span>添加水印</span>
              <span>•</span>
              <span>去除水印</span>
              <span>•</span>
              <span>批量处理</span>
            </div>

            <p className="text-xs text-muted-foreground max-w-md">
              VoidPix 是一款完全免费的在线图片处理工具，所有图片处理均在您的浏览器本地完成，
              我们不会上传或存储您的任何图片，确保您的隐私安全。
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>© 2025 VoidPix</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                本地处理 · 隐私安全
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
