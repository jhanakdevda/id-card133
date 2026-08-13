'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PhotoDropzone } from '@/components/photo-dropzone'
import { generateBuilderTitle } from '@/lib/builder-titles'
import {
  drawBadge,
  loadImage,
  makeFrameOverlayTransparent,
  type BadgeFormat,
  type BadgeAssets,
  BADGE_W,
  BADGE_H,
} from '@/lib/render-badge'
import { cn } from '@/lib/utils'

function getFontStack(varName: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim()
  return val ? `${val}, ${fallback}` : fallback
}

/**
 * Opens the X (Twitter) app if installed, otherwise falls back to twitter.com
 * in the browser. Works on iOS, Android, and desktop.
 */
function openXUrl(twitterWebUrl: string) {
  // Build the equivalent twitter:// deep link from the web URL
  const appUrl = twitterWebUrl
    .replace('https://twitter.com/intent/tweet', 'twitter://post')
    .replace('https://x.com/intent/tweet', 'twitter://post')
    .replace('text=', 'message=')

  // Attempt to open the native app
  window.location.href = appUrl

  // After 600 ms, if the page is still in focus (app didn't open), fall back
  // to the web URL in a new tab so the user lands in the browser.
  setTimeout(() => {
    if (!document.hidden) {
      window.open(twitterWebUrl, '_blank', 'noopener,noreferrer')
    }
  }, 600)
}

export function BadgeGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const assetsRef = useRef<BadgeAssets | null>(null)
  const photoImgRef = useRef<HTMLImageElement | null>(null)
  const fontsRef = useRef({ serif: 'serif', mono: 'monospace' })

  const [format, setFormat] = useState<BadgeFormat>('B')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [title, setTitle] = useState('Ship-Fast Hacker')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoValidated, setPhotoValidated] = useState(false)
  const [photoZoom, setPhotoZoom] = useState(1)
  const [photoOffsetX, setPhotoOffsetX] = useState(0)
  const [photoOffsetY, setPhotoOffsetY] = useState(0)
  const [ready, setReady] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [shareNote, setShareNote] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load brand assets + fonts once.
  useEffect(() => {
    let active = true
    async function init() {
      fontsRef.current = {
        serif: getFontStack('--font-display-serif', 'serif'),
        mono: getFontStack('--font-mono-victor', 'monospace'),
      }
      try {
        await Promise.all([
          document.fonts.load(`800 76px ${fontsRef.current.serif}`),
          document.fonts.load(`500 30px ${fontsRef.current.mono}`),
          document.fonts.load(`700 40px ${fontsRef.current.mono}`),
        ])
        await document.fonts.ready
      } catch (err) {
        console.log('[v0] font load issue:', err)
      }
      const loadAsset = async (src: string) => {
        try {
          return await loadImage(src)
        } catch (err) {
          console.warn('[v0] missing badge asset:', src, err)
          const emptyCanvas = document.createElement('canvas')
          emptyCanvas.width = 1
          emptyCanvas.height = 1
          return emptyCanvas as unknown as HTMLImageElement
        }
      }
      const [frameSource, logo, hindi] = await Promise.all([
        loadAsset('/footer-trees.png'),
        loadAsset('/hh-logo.png'),
        loadAsset('/hh-goa_hindi.svg'),
      ])
      const frame = frameSource instanceof HTMLImageElement
        ? makeFrameOverlayTransparent(frameSource)
        : frameSource
      let studioSvg: HTMLImageElement
      try {
        studioSvg = await loadAsset('/2-47.svg')
      } catch {
        studioSvg = new Image()
      }
      if (!active) return
      assetsRef.current = { frame, logo, sunrise: studioSvg, hindi }
      setReady(true)
    }
    void init()
    return () => {
      active = false
    }
  }, [])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    const assets = assetsRef.current
    if (!canvas || !assets) return
    drawBadge(canvas, {
      format, name, role, title,
      photo: photoImgRef.current,
      photoZoom, photoOffsetX, photoOffsetY,
      assets,
      fontSerif: fontsRef.current.serif,
      fontMono: fontsRef.current.mono,
    })
  }, [format, name, role, title, photoZoom, photoOffsetX, photoOffsetY])

  // Re-render whenever inputs change and assets are ready.
  useEffect(() => {
    if (ready) render()
  }, [ready, render, photoUrl])

  const handlePhoto = useCallback(
    async (dataUrl: string) => {
      setProcessing(true)
      try {
        const img = await loadImage(dataUrl)
        photoImgRef.current = img
        setPhotoUrl(dataUrl)
        setPhotoValidated(true)
      } catch (err) {
        console.log('[v0] could not load photo image:', err)
        setPhotoValidated(false)
      } finally {
        setProcessing(false)
      }
    },
    [],
  )

  const shuffleTitle = useCallback(() => {
    setTitle(generateBuilderTitle(role))
  }, [role])

  const getBlob = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png', 0.95),
    )
  }, [])

  const fileName = useCallback(() => {
    const slug =
      (format === 'B' && name.trim()
        ? name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : 'builder') || 'builder'
    return `hacker-house-goa-2026-${slug}.png`
  }, [format, name])

  const stateRef = useRef({ photoUrl, photoValidated, format, name, role, title })
  useEffect(() => { stateRef.current = { photoUrl, photoValidated, format, name, role, title } }, [photoUrl, photoValidated, format, name, role, title])

  const validate = useCallback(() => {
    const { photoUrl: pu, photoValidated: pv, format: fmt, name: n, role: r, title: t } = stateRef.current
    const e: Record<string, string> = {}
    if (!pu || !pv) e.photo = 'Valid photo with detected face is required'
    if (fmt === 'B') {
      if (!n.trim()) e.name = 'Name is required'
      if (!r.trim()) e.role = 'Role is required'
      if (!t.trim()) e.title = 'Builder title is required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }, [])

  const handleDownload = useCallback(async () => {
    if (!validate()) return
    const blob = await getBlob()
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName()
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [getBlob, fileName])

  const caption = useCallback(() => {
    if (format === 'B' && (name.trim() || role.trim())) {
      const personName = name.trim() ? name.trim() : 'Builder'
      const personRole = role.trim() ? role.trim() : 'Hacker'
      return `**${personName} just entered Build Mode.** ⚡💻\n\nRole: **${personRole}**\nMission: **Build. Innovate. Impact.**\nLocation: **Goa, India.** 🌴\n\nSee you at **Hacker House Goa 2026**.\n#FrameInGoa @247pmstudio`
    }
    return `**Builder just entered Build Mode.** ⚡💻\n\nMission: **Build. Innovate. Impact.**\nLocation: **Goa, India.** 🌴\n\nSee you at **Hacker House Goa 2026**.\n#FrameInGoa @247pmstudio`
  }, [format, name, role])

  const handleShare = useCallback(async () => {
    if (!validate()) return
    setShareNote(null)
    setProcessing(true)
    try {
      const blob = await getBlob()
      if (!blob) return
      const text = caption()

      // Always go directly to X — deep link opens the app on mobile,
      // falls back to twitter.com in browser if the app isn't installed.
      const reader = new FileReader()
      reader.onload = async (event) => {
        const imageBase64 = event.target?.result as string
        try {
          const response = await fetch('/api/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64, text }),
          })

          const data = await response.json()
          
          // Open X with the share URL (includes image URL if upload succeeded)
          if (data.twitterUrl) {
            openXUrl(data.twitterUrl)
            setShareNote('Opening X with your badge…')
          } else {
            // Fallback: open X with text only
            openXUrl(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`)
            setShareNote('Opening X (caption is ready to post)')
          }
        } catch (err) {
          console.error('[v0] share failed:', err)
          // Fallback to text-only X share
          openXUrl(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`)
          setShareNote('Opening X with caption (image upload may have failed)')
        } finally {
          setProcessing(false)
        }
      }
      reader.readAsDataURL(blob)
    } catch (err) {
      console.error('[v0] share error:', err)
      setShareNote('Error preparing badge. Please try again.')
      setProcessing(false)
    }
  }, [getBlob, caption, fileName])

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 md:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      {/* Controls */}
      <section className="flex flex-col gap-5">
        {/* Format toggle */}
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {'// choose a format'}
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/40 p-1.5">
            <FormatButton
              active={format === 'A'}
              onClick={() => setFormat('A')}
              label="Quick"
              sub="less noise · more signal"
            />
            <FormatButton
              active={format === 'B'}
              onClick={() => setFormat('B')}
              label="Full badge"
              sub="photo + details"
            />
          </div>
        </div>

        {/* Upload */}
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {'// your photo'} <span className="text-accent">*</span>
          </p>
          <PhotoDropzone
            onPhoto={handlePhoto}
            previewUrl={photoUrl}
            busy={processing}
          />
          {errors.photo && <p className="mt-1 font-mono text-xs text-accent">{errors.photo}</p>}

          {/* Photo adjust sliders — only when photo is uploaded */}
          {photoUrl && (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-secondary/30 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">adjust photo</p>
              <Slider label="Zoom" min={1} max={3} step={0.05} value={photoZoom} onChange={setPhotoZoom} />
              <Slider label="X" min={-1} max={1} step={0.05} value={photoOffsetX} onChange={setPhotoOffsetX} />
              <Slider label="Y" min={-1} max={1} step={0.05} value={photoOffsetY} onChange={setPhotoOffsetY} />
            </div>
          )}
        </div>

        {/* Fields (Format B only) */}
        {format === 'B' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="name *"
                value={name}
                onChange={(v) => { setName(v); setErrors((p) => ({ ...p, name: '' })) }}
                placeholder="Ada Lovelace"
                maxLength={28}
                error={errors.name}
              />
              <Field
                label="stack / role *"
                value={role}
                onChange={(v) => { setRole(v); if (v.trim()) setErrors((p) => ({ ...p, role: '' })) }}
                placeholder="Full-stack · React + Rust"
                maxLength={40}
                error={errors.role}
              />
            </div>
            <div>
              <label
                htmlFor="builder-title"
                className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-muted-foreground"
              >
                builder title <span className="text-accent">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="builder-title"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: '' })) }}
                  maxLength={26}
                  className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-secondary/40 px-3 font-mono text-sm text-foreground outline-none transition-colors focus:border-primary"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={shuffleTitle}
                  className="h-11 shrink-0 gap-1.5 px-3 font-mono text-xs sm:px-4 sm:text-sm"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M16 3h5v5" />
                    <path d="M4 20 21 3" />
                    <path d="M21 16v5h-5" />
                    <path d="m15 15 6 6" />
                    <path d="M4 4l5 5" />
                  </svg>
                  <span className="hidden sm:inline">shuffle</span>
                  <span className="sm:hidden">mix</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Preview + actions */}
      <section className="flex flex-col gap-4 lg:sticky lg:top-8">
        <div className="overflow-hidden rounded-2xl border-2 border-primary/40 bg-[#025431] shadow-2xl shadow-black/40">
          <canvas
            ref={canvasRef}
            width={BADGE_W}
            height={BADGE_H}
            className="block h-auto w-full"
            aria-label="Live preview of your Hacker House Goa 2026 frame"
          />
          {!ready && (
            <div className="flex items-center justify-center py-10 font-mono text-sm text-primary">
              loading the frame…
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleDownload}
            disabled={!ready || !photoValidated}
            className="h-12 gap-2 font-mono text-sm font-semibold"
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </Button>
          <Button
            onClick={handleShare}
            disabled={!ready || !photoValidated}
            variant="secondary"
            className="h-12 gap-2 border border-border font-mono text-sm font-semibold"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
            </svg>
            Share to X
          </Button>
        </div>

        {shareNote && (
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-xs text-foreground">
            {shareNote}
          </p>
        )}
        <p className="text-center font-mono text-xs text-muted-foreground">
          no login · no signup · downloads a real PNG
        </p>
      </section>
    </div>
  )
}

function FormatButton({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean
  onClick: () => void
  label: string
  sub: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start rounded-lg px-4 py-2.5 text-left transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-secondary',
      )}
    >
      <span className="font-mono text-sm font-semibold">{label}</span>
      <span
        className={cn(
          'mt-1.5 font-mono text-xs',
          active ? 'text-primary-foreground/80' : 'text-muted-foreground',
        )}
      >
        {sub}
      </span>
    </button>
  )
}

function Slider({
  label, min, max, step, value, onChange,
}: {
  label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer accent-primary"
      />
      <span className="w-8 text-right font-mono text-[10px] text-foreground/60">{value.toFixed(2)}</span>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  error?: string
}) {
  const id = `field-${label.replace(/[^a-z]/gi, '-')}`
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn(
          'h-11 w-full rounded-lg border bg-secondary/40 px-3 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary',
          error ? 'border-accent' : 'border-input',
        )}
      />
      {error && <p className="mt-1 font-mono text-xs text-accent">{error}</p>}
    </div>
  )
}
