'use client'

import { useCallback, useRef, useState } from 'react'
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
    // Convert iPhone HEIC/HEIF to JPEG in the browser.
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

export function PhotoDropzone({ onPhoto, previewUrl, busy }: PhotoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      setError(null)
      try {
        const url = await fileToImageUrl(file)
        onPhoto(url)
      } catch (err) {
        console.log('[v0] photo processing failed:', err)
        setError('Could not read that image. Try a JPG or PNG.')
      }
    },
    [onPhoto],
  )

  return (
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
          {busy
            ? 'processing photo…'
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

      {error && (
        <p className="mt-2 font-mono text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
