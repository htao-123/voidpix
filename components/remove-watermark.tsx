"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Download, Loader2, Sparkles, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { smartRemoveWatermarkWithProgress, WatermarkRegion, WatermarkRemovalOptions } from "@/lib/ai-watermark-remover";

interface RemoveWatermarkProps {
  imagePreview: string | null;
}

type ProcessingStep = {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
};

const PROCESSING_STEPS: ProcessingStep[] = [
  { id: 'init', label: '初始化 AI 引擎', status: 'pending' },
  { id: 'prepare', label: '准备处理区域', status: 'pending' },
  { id: 'inpaint', label: 'AI 修复处理', status: 'pending' },
  { id: 'finalize', label: '生成处理结果', status: 'pending' },
];

export default function RemoveWatermark({ imagePreview }: RemoveWatermarkProps) {
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<ProcessingStep[]>(PROCESSING_STEPS);
  const [error, setError] = useState<string | null>(null);
  const [comparePosition, setComparePosition] = useState([50]);
  const [showOriginal, setShowOriginal] = useState(false);

  // Manual selection state
  const [selectedRegions, setSelectedRegions] = useState<WatermarkRegion[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Parameters
  const [patchSize, setPatchSize] = useState(7);
  const [method, setMethod] = useState<'patch' | 'aggressive'>('patch');

  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Draw overlay function
  const drawOverlay = useCallback(() => {
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;

    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Draw semi-transparent overlay on non-selected areas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Clear the selected regions (make them bright)
    ctx.globalCompositeOperation = 'destination-out';
    selectedRegions.forEach(region => {
      ctx.fillRect(region.x, region.y, region.width, region.height);
    });

    // Draw current drawing rectangle
    if (currentRect) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
    }

    // Draw borders for selected regions
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    selectedRegions.forEach((region, index) => {
      ctx.strokeRect(region.x, region.y, region.width, region.height);

      // Draw label
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(region.x, region.y - 20, 60, 20);
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.fillText(`区域 ${index + 1}`, region.x + 5, region.y - 6);
    });
  }, [selectedRegions, currentRect]);

  // Setup canvas when image loads
  useEffect(() => {
    if (!imagePreview) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      originalImageRef.current = img;

      const displayCanvas = displayCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      if (!displayCanvas || !overlayCanvas) return;

      displayCanvas.width = img.width;
      displayCanvas.height = img.height;
      overlayCanvas.width = img.width;
      overlayCanvas.height = img.height;

      const ctx = displayCanvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      drawOverlay();
    };
    img.src = imagePreview;
  }, [imagePreview, drawOverlay]);

  // Redraw overlay when regions change
  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // Force canvas redraw when reset trigger changes
  useEffect(() => {
    if (resetTrigger > 0) {
      const img = originalImageRef.current;
      const displayCanvas = displayCanvasRef.current;
      if (!img || !displayCanvas) return;

      const displayCtx = displayCanvas.getContext("2d");
      if (!displayCtx) return;

      // Redraw the original image
      displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
      displayCtx.drawImage(img, 0, 0);

      // Redraw overlay (now with empty regions)
      drawOverlay();
    }
  }, [resetTrigger, drawOverlay]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setDrawStart(coords);
    setCurrentRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return;

    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    const width = coords.x - drawStart.x;
    const height = coords.y - drawStart.y;

    setCurrentRect({
      x: width > 0 ? drawStart.x : coords.x,
      y: height > 0 ? drawStart.y : coords.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) return;

    if (currentRect.width > 10 && currentRect.height > 10) {
      setSelectedRegions([...selectedRegions, {
        x: currentRect.x,
        y: currentRect.y,
        width: currentRect.width,
        height: currentRect.height,
        confidence: 1.0,
      }]);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentRect(null);
  };

  const removeRegion = (index: number) => {
    setSelectedRegions(selectedRegions.filter((_, i) => i !== index));
  };

  const clearAllRegions = () => {
    setSelectedRegions([]);
  };

  const updateStep = (stepIndex: number, status: ProcessingStep['status']) => {
    setSteps(prev => {
      const newSteps = [...prev];
      newSteps[stepIndex] = { ...newSteps[stepIndex], status };
      return newSteps;
    });
    setCurrentStep(stepIndex);
  };

  const processAI = async () => {
    const img = originalImageRef.current;
    if (!img) return;

    // Check if we have regions to process
    if (selectedRegions.length === 0) {
      setError('请先在图片上选择要去除的水印区域');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResultUrl(null);
    setProcessedImage(null);
    setProgress(0);
    setSteps(PROCESSING_STEPS.map(s => ({ ...s, status: 'pending' })));
    setCurrentStep(0);

    try {
      // 步骤 1: 初始化
      updateStep(0, 'processing');
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep(0, 'completed');

      // 步骤 2-4: AI 处理
      const options: WatermarkRemovalOptions = {
        customRegions: selectedRegions,
        patchSize,
        method,
      };

      const blob = await smartRemoveWatermarkWithProgress(img, {
        onProgress: (progress, step) => {
          setProgress(progress);
          if (step === 'detect' || step === 'analyze') {
            updateStep(1, 'processing');
          } else if (step === 'inpaint') {
            updateStep(1, 'completed');
            updateStep(2, 'processing');
          } else if (step === 'finalize') {
            updateStep(2, 'completed');
            updateStep(3, 'processing');
          }
        },
      }, options);

      // 完成
      updateStep(3, 'completed');
      setProgress(100);

      // 转换为 Data URL 用于显示
      const resultDataUrl = URL.createObjectURL(blob);
      setResultUrl(resultDataUrl);
      setProcessedImage(resultDataUrl);

    } catch (err) {
      console.error("AI 去水印失败:", err);
      setError(err instanceof Error ? err.message : "处理失败，请重试");
      setSteps(prev => {
        const newSteps = [...prev];
        newSteps[currentStep] = { ...newSteps[currentStep], status: 'error' };
        return newSteps;
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "watermark-removed-ai.png";
    a.click();
  };

  const resetCanvas = () => {
    // Clear current drawing rectangle
    setCurrentRect(null);

    // Clear selected regions
    setSelectedRegions([]);

    // Reset all states
    setProcessedImage(null);
    setResultUrl(null);
    setError(null);
    setProgress(0);
    setSteps(PROCESSING_STEPS.map(s => ({ ...s, status: 'pending' })));
    setCurrentStep(0);
    setShowOriginal(false);
    setComparePosition([50]);

    // Trigger canvas redraw after state updates
    setResetTrigger(prev => prev + 1);
  };

  const getStepIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-purple-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">AI 智能去水印</CardTitle>
            <CardDescription className="text-sm">
              手动选择水印区域，AI 智能修复
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 参数控制 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Patch 大小</span>
              <span className="text-sm text-blue-700 dark:text-blue-300">{patchSize}</span>
            </div>
            <Slider
              value={[patchSize]}
              onValueChange={(v) => setPatchSize(v[0])}
              min={3}
              max={15}
              step={2}
              className="w-full"
            />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              越大的值处理越快但细节保留较少，建议 5-9
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">修复算法</span>
            <div className="flex gap-2">
              <Button
                variant={method === 'patch' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMethod('patch')}
                className="flex-1"
              >
                Patch 纹理合成
              </Button>
              <Button
                variant={method === 'aggressive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMethod('aggressive')}
                className="flex-1"
              >
                快速修复
              </Button>
            </div>
          </div>
        </div>

        {/* 图片区域 */}
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 overflow-hidden relative">
          {imagePreview && !processedImage && (
            <div className="relative inline-block w-full">
              <canvas
                ref={displayCanvasRef}
                className="max-w-full"
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute top-0 left-0 max-w-full cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          )}

          {processedImage && (
            <div className="relative">
              <div className="relative max-w-full select-none">
                <img
                  src={imagePreview!}
                  alt="原始图片"
                  className="max-w-full block"
                  style={{ clipPath: showOriginal ? 'none' : `inset(0 ${(100 - comparePosition[0])}% 0 0)` }}
                />
                <img
                  src={processedImage}
                  alt="处理后图片"
                  className="max-w-full block absolute top-0 left-0"
                  style={{ clipPath: showOriginal ? 'inset(0 100% 0 0)' : `inset(0 0 0 ${comparePosition[0]}%)` }}
                />
                {!showOriginal && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                    style={{ left: `${comparePosition[0]}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                      <ChevronLeft className="h-4 w-4 text-gray-600" />
                      <ChevronRight className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  处理后
                </div>
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  原图
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 已选区域列表 */}
        {selectedRegions.length > 0 && !processedImage && (
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                已选择 {selectedRegions.length} 个区域
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllRegions}
              >
                清除全部
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedRegions.map((region, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-purple-950/50 px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                >
                  <span>区域 {index + 1}: {Math.round(region.width)}×{Math.round(region.height)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => removeRegion(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 对比控制 */}
        {processedImage && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">前后对比</span>
              <Button
                variant={showOriginal ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOriginal(!showOriginal)}
              >
                {showOriginal ? "查看处理后" : "查看原图"}
              </Button>
            </div>
            {!showOriginal && (
              <div className="space-y-2">
                <Slider
                  value={comparePosition}
                  onValueChange={setComparePosition}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>左滑查看原图</span>
                  <span>右滑查看处理后</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 处理进度 */}
        {isProcessing && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
                <span className="font-semibold text-purple-900 dark:text-purple-100">AI 处理中</span>
              </div>
              <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">{progress}%</span>
            </div>

            <Progress value={progress} className="h-2" />

            <div className="space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                    index === currentStep ? 'text-purple-700 dark:text-purple-300 font-medium' : 'text-muted-foreground'
                  }`}
                >
                  <div className="flex-shrink-0 w-5">
                    {getStepIcon(step.status)}
                  </div>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-300">
              <p className="font-semibold">处理失败</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            onClick={processAI}
            disabled={isProcessing || !!processedImage}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12 text-base"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                处理选中区域
              </>
            )}
          </Button>
          {resultUrl && (
            <Button onClick={handleDownload} variant="outline" className="h-12">
              <Download className="mr-2 h-5 w-5" />
              下载
            </Button>
          )}
          <Button
            onClick={resetCanvas}
            variant="outline"
            disabled={isProcessing}
            className="h-12"
          >
            重置
          </Button>
        </div>

        {/* AI 说明 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                AI
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <p className="font-medium text-blue-900 dark:text-blue-100">使用说明</p>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p>• <strong>手动选择</strong>：在图片上拖动鼠标框选水印区域</p>
                <p>• <strong>Patch 大小</strong>：控制纹理块大小，值越大处理越快</p>
                <p>• <strong>修复算法</strong>：选择纹理合成或快速修复模式</p>
                <p>• <strong>对比查看</strong>：处理后可拖动滑块查看前后对比</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
