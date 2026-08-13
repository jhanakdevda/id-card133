'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface PhotoDropzoneProps {
  onPhoto: (dataUrl: string) => void
  previewUrl: string | null
  busy: boolean
}

/** Max pixel dimension for the image passed to the badge renderer. */
const MAX_PX = 1920

/** Draw a bitmap/image to a canvas capped at MAX_PX, return JPEG data-URL. */
function bitmapToDataUrl(source: ImageBitmap | HTMLImageElement): string {
  const sw = source instanceof ImageBitmap ? source.width  : source.naturalWidth
  const sh = source instanceof ImageBitmap ? source.height : source.naturalHeight
  const scale = Math.min(1, MAX_PX / Math.max(sw, sh))
  const c = document.createElement('canvas')
  c.width  = Math.round(sw * scale)
  c.height = Math.round(sh * scale)
  c.getContext('2d')?.drawImage(source as CanvasImageSource, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.82)
}

/** Converts any image file (of any size, e.g. 1MB to 100MB+) into an optimized JPEG Data URL. */
async function fileToImageUrl(file: File): Promise<string> {
  const isHeic =
    /image\/hei(c|f)/i.test(file.type) ||
    /\.(heic|heif)$/i.test(file.name) ||
    (file.type === '' && /\.(heic|heif)$/i.test(file.name))

  if (isHeic) {
    // ── Tier 1 (HEIC): Native browser hardware decoder (iOS Safari 17+, macOS Safari)
    try {
      const bitmap = await createImageBitmap(file)
      const dataUrl = bitmapToDataUrl(bitmap)
      bitmap.close()
      return dataUrl
    } catch {
      // Native HEIC decode not available — proceed to heic2any fallback
    }

    // ── Tier 2 (HEIC): heic2any JS converter
    try {
      const heic2any = (await import('heic2any')).default
      const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.75 })
      const blob = Array.isArray(converted) ? converted[0] : converted
      const bitmap = await createImageBitmap(blob)
      const dataUrl = bitmapToDataUrl(bitmap)
      bitmap.close()
      return dataUrl
    } catch (err) {
      console.error('[photo-dropzone] HEIC conversion failed:', err)
      throw new Error('Could not convert HEIC/HEIF image. Try exporting as JPG or PNG.')
    }
  }

  // ── Tier 1 (All Formats): Hardware-accelerated createImageBitmap
  try {
    const bitmap = await createImageBitmap(file)
    const dataUrl = bitmapToDataUrl(bitmap)
    bitmap.close()
    return dataUrl
  } catch {
    // createImageBitmap failed or unsupported — fallback to HTMLImageElement
  }

  // ── Tier 2 (All Formats): HTMLImageElement async decoder
  try {
    const objectUrl = URL.createObjectURL(file)
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const res = bitmapToDataUrl(img)
          URL.revokeObjectURL(objectUrl)
          resolve(res)
        } catch (e) {
          URL.revokeObjectURL(objectUrl)
          reject(e)
        }
      }
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Image load failed'))
      }
      img.src = objectUrl
    })
    return dataUrl
  } catch {
    // HTMLImageElement failed — fallback to FileReader
  }

  // ── Tier 3 (Fallback): FileReader
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the image file.'))
    reader.readAsDataURL(file)
  })
}

export function PhotoDropzone({ onPhoto, previewUrl, busy }: PhotoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isProcessingFile, setIsProcessingFile] = useState(false)

  // Pre-warm heic2any so the module is cached before the user picks a file.
  useEffect(() => {
    import('heic2any').catch(() => { /* optional dep, ignore */ })
  }, [])

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      try {
        setError(null)
        setIsProcessingFile(true)
        const url = await fileToImageUrl(file)
        onPhoto(url)
      } catch (err) {
        console.log('[photo-dropzone] photo processing failed:', err)
        setError('Could not read that image. Try another photo.')
      } finally {
        setIsProcessingFile(false)
      }
    },
    [onPhoto],
  )

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      setCameraActive(true)
      // Attach stream after state update so the video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 100)
    } catch (err) {
      console.error('Camera access failed:', err)
      setError('Camera access denied. Please check your browser permissions or use photo upload instead.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    setIsCapturing(true)

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setIsCapturing(false)
      return
    }

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    onPhoto(dataUrl)
    setIsCapturing(false)
    stopCamera()
  }, [onPhoto, stopCamera])

  return (
    <div className="flex flex-col gap-4">
      {/* Camera View */}
      {cameraActive ? (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-black overflow-hidden">
          {/* Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video bg-black"
          />

          {/* Camera Controls */}
          <div className="flex gap-2 p-4">
            <button
              type="button"
              onClick={capturePhoto}
              disabled={isCapturing}
              className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-mono text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {isCapturing ? 'Capturing…' : 'Capture Photo'}
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="flex-1 bg-secondary text-foreground px-4 py-2 rounded-lg font-mono text-sm font-semibold hover:bg-secondary/80"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Upload Section */}
          <div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                void handleFile(e.dataTransfer.files?.[0])
              }}
              className={cn(
                'group relative flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-secondary/40 px-6 py-8 text-center transition-colors',
                dragging && 'border-primary bg-primary/10',
                (busy || isProcessingFile) && 'pointer-events-none opacity-70',
              )}
              aria-label="Upload a photo"
            >
              {isProcessingFile ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="font-mono text-xs text-primary">Processing photo…</span>
                </div>
              ) : previewUrl ? (
                <img
                  src={previewUrl || '/placeholder.svg'}
                  alt="Your uploaded photo preview"
                  className="h-24 w-24 rounded-lg object-cover ring-2 ring-primary/60"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </span>
              )}
              <span className="font-mono text-sm text-foreground">
                {isProcessingFile ? 'Optimizing image size…' : previewUrl ? 'tap to swap photo' : 'drop a photo or tap to upload'}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                Any size file · JPG · PNG · HEIC · HEIF · WebP
              </span>
            </button>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
              className="sr-only"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </div>

          {/* Camera Capture Button */}
          <button
            type="button"
            onClick={startCamera}
            className="w-full bg-secondary border border-border text-foreground px-4 py-3 rounded-lg font-mono text-sm font-semibold hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Capture Photo
          </button>

          {/* Preview success indicator */}
          {previewUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-green-500"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p className="font-mono text-xs text-green-600">
                ✓ Photo added! Ready to create your ID card.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-accent mt-0.5 flex-shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="font-mono text-xs text-accent">{error}</p>
            </div>
          )}
        </>
      )}

      {/* Hidden Canvas for Camera Capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
