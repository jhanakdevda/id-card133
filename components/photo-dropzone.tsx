'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface PhotoDropzoneProps {
  onPhoto: (dataUrl: string) => void
  previewUrl: string | null
  busy: boolean
}

async function fileToImageUrl(file: File): Promise<string> {
  const isHeic =
    /image\/hei(c|f)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)

  let blob: Blob = file
  if (isHeic) {
    const heic2any = (await import('heic2any')).default
    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.92,
    })
    blob = Array.isArray(converted) ? converted[0] : converted
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function detectFaces(imageUrl: string): Promise<number> {
  try {
    // Dynamic import to load face-api.js
    const faceapi = await import('@vladmandic/face-api')
    
    // Create an image element
    const img = document.createElement('img')
    img.src = imageUrl
    img.crossOrigin = 'anonymous'
    
    await new Promise((resolve) => {
      img.onload = resolve
    })

    // Load models (lazy load on first use)
    const modelsUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/'
    if (!faceapi.nets.tinyFaceDetector.isLoaded) {
      await faceapi.nets.tinyFaceDetector.load(modelsUrl)
    }

    // Detect faces with optimized options for speed
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320, // Reduced from default for faster detection
      scoreThreshold: 0.5, // More lenient threshold for speed
    })
    const detections = await faceapi.detectAllFaces(img, options)
    return detections.length
  } catch (err) {
    console.error('Face detection failed:', err)
    return 0
  }
}

export function PhotoDropzone({ onPhoto, previewUrl, busy }: PhotoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationStatus, setValidationStatus] = useState<'pending' | 'validating' | 'valid' | 'error'>('pending')
  const [cameraActive, setCameraActive] = useState(false)
  const [facesDetected, setFacesDetected] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Load face detection models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const faceapi = await import('@vladmandic/face-api')
        const modelsUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/'
        if (!faceapi.nets.tinyFaceDetector.isLoaded) {
          await faceapi.nets.tinyFaceDetector.load(modelsUrl)
        }
      } catch (err) {
        console.error('Failed to load face detection models:', err)
      }
    }
    loadModels()
  }, [])

  const validateAndProcessPhoto = useCallback(
    async (dataUrl: string) => {
      setValidationStatus('validating')
      setIsProcessing(true)
      try {
        const faceCount = await detectFaces(dataUrl)
        setFacesDetected(faceCount)

        if (faceCount === 1) {
          setValidationStatus('valid')
          setError(null)
          onPhoto(dataUrl)
        } else if (faceCount === 0) {
          setValidationStatus('error')
          setError('No face detected. Please upload or capture a clear photo showing your face.')
        } else {
          setValidationStatus('error')
          setError('Multiple faces detected. Please upload or capture a photo with only one person.')
        }
      } catch (err) {
        console.error('Photo validation failed:', err)
        setValidationStatus('error')
        setError('Could not validate the photo. Please try again.')
      } finally {
        setIsProcessing(false)
      }
    },
    [onPhoto],
  )

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      try {
        const url = await fileToImageUrl(file)
        await validateAndProcessPhoto(url)
      } catch (err) {
        console.log('[v0] photo processing failed:', err)
        setValidationStatus('error')
        setError('Could not read that image. Try a JPG or PNG.')
      }
    },
    [validateAndProcessPhoto],
  )

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch (err) {
      console.error('Camera access failed:', err)
      setError('Camera access denied. Please check your permissions or use photo upload instead.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
    setFacesDetected(null)
  }, [])

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    // Set canvas size to video size
    canvasRef.current.width = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight

    // Draw video frame to canvas
    ctx.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95)

    // Validate and process
    await validateAndProcessPhoto(dataUrl)
    stopCamera()
  }, [validateAndProcessPhoto, stopCamera])

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
            className="w-full aspect-video bg-black"
          />

          {/* Face Detection Guide Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="relative w-48 h-64 border-2 border-yellow-400 rounded-lg animate-pulse opacity-60" />
          </div>

          {/* Face Detection Status */}
          <div className="px-4 py-2 bg-secondary/80">
            {facesDetected !== null && (
              <p className={cn(
                'font-mono text-sm text-center',
                facesDetected === 1 ? 'text-green-500' : 'text-red-500'
              )}>
                {facesDetected === 0 && 'No face detected'}
                {facesDetected === 1 && '✓ Face detected! Ready to capture.'}
                {facesDetected > 1 && `Multiple faces detected (${facesDetected})`}
              </p>
            )}
          </div>

          {/* Camera Controls */}
          <div className="flex gap-2 p-4">
            <button
              type="button"
              onClick={capturePhoto}
              disabled={isProcessing}
              className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-mono text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {isProcessing ? 'Validating...' : 'Capture Photo'}
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
                busy && 'pointer-events-none opacity-70',
              )}
              aria-label="Upload a photo"
            >
              {previewUrl ? (
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
                {isProcessing
                  ? 'validating photo…'
                  : previewUrl
                    ? 'tap to swap photo'
                    : 'drop a photo or tap to upload'}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                JPG · PNG · HEIC
              </span>
            </button>

            <input
              ref={inputRef}
              type="file"
              accept="image/*,.heic,.heif"
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

          {/* Validation Status Messages */}
          {validationStatus === 'valid' && (
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
                ✓ Photo validated! Ready to create your ID card.
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
