"use client";

import { useState } from "react";
import { Upload, Image as ImageIcon, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import ImageUpload from "@/components/image-upload";
import FormatConverter from "@/components/format-converter";
import ImageCompressor from "@/components/image-compressor";
import AddWatermark from "@/components/add-watermark";
import RemoveWatermark from "@/components/remove-watermark";

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageSelect = (file: File, preview: string) => {
    setImageFile(file);
    setSelectedImage(preview);
  };

  const handleImageClear = () => {
    setImageFile(null);
    setSelectedImage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold">VoidPix</h1>
          </div>
          <p className="text-sm text-muted-foreground hidden sm:block">免费在线图片处理工具</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {!selectedImage ? (
          // Upload Section
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-2xl">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <ImageIcon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">上传图片开始处理</CardTitle>
                <CardDescription>支持 JPG、PNG、WEBP 等常见格式</CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload onImageSelect={handleImageSelect} />
              </CardContent>
            </Card>

            {/* Features */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <Upload className="h-5 w-5 text-blue-500" />
                  </div>
                  <h3 className="font-semibold mb-1">格式转换</h3>
                  <p className="text-sm text-muted-foreground">JPG、PNG、WEBP 互转</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                    <Download className="h-5 w-5 text-green-500" />
                  </div>
                  <h3 className="font-semibold mb-1">图片压缩</h3>
                  <p className="text-sm text-muted-foreground">减小文件大小</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                  </div>
                  <h3 className="font-semibold mb-1">添加水印</h3>
                  <p className="text-sm text-muted-foreground">文字或图片水印</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                    <ImageIcon className="h-5 w-5 text-orange-500" />
                  </div>
                  <h3 className="font-semibold mb-1">去除水印</h3>
                  <p className="text-sm text-muted-foreground">简单去水印功能</p>
                </CardContent>
              </Card>
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
                <RemoveWatermark imageFile={imageFile} imagePreview={selectedImage} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/40 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>VoidPix - 完全免费的图片处理工具 | 所有处理均在本地完成，保护您的隐私</p>
        </div>
      </footer>
    </div>
  );
}
