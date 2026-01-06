import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExplanationImage {
  id: string;
  storage_url: string;
  source_type: string;
  image_order: number;
}

interface ExplanationGalleryProps {
  images: ExplanationImage[];
  className?: string;
}

export function ExplanationGallery({ images, className }: ExplanationGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const explanationImages = images
    .filter(img => img.source_type.startsWith("explanation_"))
    .sort((a, b) => a.image_order - b.image_order);

  if (explanationImages.length === 0) {
    return null;
  }

  const currentImage = explanationImages[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : explanationImages.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev < explanationImages.length - 1 ? prev + 1 : 0));
  };

  return (
    <>
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-4 space-y-4">
          {/* Header with navigation */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Explanation</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Page {currentIndex + 1} of {explanationImages.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFullscreen(true)}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Image display */}
          <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
            <img
              src={currentImage.storage_url}
              alt={`Explanation page ${currentIndex + 1}`}
              className={cn(
                "w-full h-full object-contain transition-transform",
                isZoomed && "scale-150 cursor-zoom-out"
              )}
              onClick={() => setIsZoomed(!isZoomed)}
            />
          </div>

          {/* Navigation controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              disabled={explanationImages.length <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page indicators */}
            <div className="flex gap-2">
              {explanationImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    index === currentIndex 
                      ? "bg-primary" 
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              disabled={explanationImages.length <= 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Thumbnail strip */}
          {explanationImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {explanationImages.map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "flex-shrink-0 w-20 h-16 rounded-md overflow-hidden border-2 transition-colors",
                    index === currentIndex 
                      ? "border-primary" 
                      : "border-transparent hover:border-muted-foreground/30"
                  )}
                >
                  <img
                    src={img.storage_url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen modal */}
      {showFullscreen && (
        <div 
          className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center"
          onClick={() => setShowFullscreen(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={() => setShowFullscreen(false)}
          >
            <X className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2"
            onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>

          <img
            src={currentImage.storage_url}
            alt={`Explanation page ${currentIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2"
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-muted-foreground">
            Page {currentIndex + 1} of {explanationImages.length}
          </div>
        </div>
      )}
    </>
  );
}
