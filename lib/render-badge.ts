export type BadgeFormat = 'A' | 'B'

export interface BadgeAssets {
  frame: HTMLCanvasElement | HTMLImageElement
  logo: HTMLImageElement
  sunrise: HTMLImageElement // 2:47 PM Studio SVG
  hindi: HTMLImageElement
}

export interface BadgeData {
  format: BadgeFormat
  name: string
  role: string
  title: string
  photo: HTMLImageElement | null
  photoZoom: number
  photoOffsetX: number
  photoOffsetY: number
  assets: BadgeAssets
  fontSerif: string
  fontMono: string
}

export const BADGE_W = 1080
export const BADGE_H = 1350

const GREEN      = '#025431'
const GREEN_DEEP = '#006C3E'
const YELLOW     = '#fee101'
const CREAM      = '#fffbe8'
const MAGENTA    = '#e6167a'
const INK        = '#053a22'

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y,     x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x,     y + h, radius)
  ctx.arcTo(x,     y + h, x,     y,     radius)
  ctx.arcTo(x,     y,     x + w, y,     radius)
  ctx.closePath()
}

function drawImageCoverTransform(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  zoom: number, offsetX: number, offsetY: number,
) {
  const targetRatio = w / h
  const imgRatio    = img.width / img.height
  let sw: number, sh: number, sx: number, sy: number
  if (imgRatio > targetRatio) {
    sh = img.height / zoom; sw = sh * targetRatio
  } else {
    sw = img.width / zoom; sh = sw / targetRatio
  }
  const maxSx = img.width  - sw
  const maxSy = img.height - sh
  sx = maxSx / 2 + offsetX * maxSx / 2
  sy = maxSy / 2 + offsetY * maxSy / 2
  sx = Math.max(0, Math.min(maxSx, sx))
  sy = Math.max(0, Math.min(maxSy, sy))
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number, y: number, maxW: number, maxH: number,
): number {
  const ratio = img.width / img.height
  let w = maxW, h = w / ratio
  if (h > maxH) { h = maxH; w = h * ratio }
  ctx.drawImage(img, cx - w / 2, y, w, h)
  return h
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string, maxWidth: number,
  baseSize: number, minSize: number,
  weight: string, family: string,
) {
  let size = baseSize
  ctx.font = `${weight} ${size}px ${family}`
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 2
    ctx.font = `${weight} ${size}px ${family}`
  }
  return size
}

function drawBarcode(
  ctx: CanvasRenderingContext2D,
  seed: string,
  cx: number, y: number, totalW: number, barH: number,
) {
  const hash = seed.split('').reduce(
    (acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffffffff,
    0x1234abcd,
  )
  const bars: number[] = []
  let rng = Math.abs(hash)
  for (let i = 0; i < 46; i++) {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff
    bars.push(1 + (Math.abs(rng) % 3))
  }
  const totalUnits = bars.reduce((s, b) => s + b, 0)
  const unitPx = totalW / totalUnits
  let x = cx - totalW / 2
  bars.forEach((w, i) => {
    if (i % 2 === 0) ctx.fillRect(Math.round(x), y, Math.max(1, Math.round(w * unitPx)), barH)
    x += w * unitPx
  })
}

export function drawBadge(canvas: HTMLCanvasElement, data: BadgeData) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width  = BADGE_W
  canvas.height = BADGE_H

  const { format, assets, photo, photoZoom, photoOffsetX, photoOffsetY, fontSerif, fontMono } = data
  const centerX = BADGE_W / 2

  // Base green
  ctx.fillStyle = GREEN
  ctx.fillRect(0, 0, BADGE_W, BADGE_H)

  // ── Background texture ──
  // 1. Dot grid
  ctx.save()
  ctx.globalAlpha = 0.07
  ctx.fillStyle = CREAM
  const dotGap = 54
  for (let dx = dotGap / 2; dx < BADGE_W; dx += dotGap) {
    for (let dy = dotGap / 2; dy < BADGE_H; dy += dotGap) {
      ctx.beginPath()
      ctx.arc(dx, dy, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()

  // 2. Subtle diagonal texture is intentionally removed for a cleaner badge background.

  // 3. Radial glow — warm centre
  ctx.save()
  const grd = ctx.createRadialGradient(BADGE_W / 2, BADGE_H * 0.38, 0, BADGE_W / 2, BADGE_H * 0.38, BADGE_W * 0.72)
  grd.addColorStop(0,   'rgba(254,225,1,0.10)')
  grd.addColorStop(0.5, 'rgba(2,84,49,0)')
  grd.addColorStop(1,   'rgba(5,58,34,0.28)')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, BADGE_W, BADGE_H)
  ctx.restore()

  // Frame overlay anchored to bottom — preserve the footer trees in full color with transparency
  if (assets.frame.width > 0 && assets.frame.height > 0) {
    const frameRatio = assets.frame.width / assets.frame.height
    const frameDrawH = BADGE_W / frameRatio
    ctx.save()
    ctx.globalAlpha = 0.9
    ctx.drawImage(assets.frame, 0, BADGE_H - frameDrawH, BADGE_W, frameDrawH)
    ctx.restore()
    ctx.globalAlpha = 1
  }

  // Header: गोवा logo left
  const headerY   = 48
  const hindiSize = 110
  ctx.drawImage(assets.hindi, 48, headerY, hindiSize, hindiSize)

  // Vertical divider
  ctx.strokeStyle = CREAM
  ctx.lineWidth   = 2
  ctx.globalAlpha = 0.4
  ctx.beginPath()
  ctx.moveTo(48 + hindiSize + 20, headerY + 10)
  ctx.lineTo(48 + hindiSize + 20, headerY + hindiSize - 10)
  ctx.stroke()
  ctx.globalAlpha = 1

  // HACKER HOUSE logo centered
  let cy = headerY
  const logoH = drawImageContain(ctx, assets.logo, centerX, cy, BADGE_W * 0.45, 110)
  cy += logoH + 22

  // Top-right: 2:47 PM Studio SVG — wider stretch
  const studioW = 160
  const studioH = 120
  ctx.drawImage(assets.sunrise, BADGE_W - 48 - studioW, headerY, studioW, studioH)

  // BUILD • INNOVATE • IMPACT tagline
  ctx.font         = `700 36px ${fontMono}`
  ctx.fillStyle    = YELLOW
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('BUILD • INNOVATE • IMPACT', centerX, cy + 14)
  ctx.textBaseline = 'top'
  cy += 44

  // Photo card
  const photoSize = format === 'B' ? 400 : 480
  const cardPad   = 14
  const cardW     = photoSize + cardPad * 2
  const cardX     = centerX - cardW / 2
  const cardTop   = cy
  const cardH     = photoSize + cardPad * 2 + 52
  const cardR     = 16

  // Drop shadow
  ctx.save()
  ctx.shadowColor   = 'rgba(0,0,0,0.6)'
  ctx.shadowBlur    = 52
  ctx.shadowOffsetY = 22
  roundRectPath(ctx, cardX, cardTop, cardW, cardH, cardR)
  ctx.fillStyle = YELLOW
  ctx.fill()
  ctx.restore()

  // Outer yellow frame fill (no shadow)
  roundRectPath(ctx, cardX, cardTop, cardW, cardH, cardR)
  ctx.fillStyle = YELLOW
  ctx.fill()

  // Hot-pink inner border ring
  const inset = 5
  roundRectPath(ctx, cardX + inset, cardTop + inset, cardW - inset * 2, cardH - inset * 2, cardR - 2)
  ctx.strokeStyle = MAGENTA
  ctx.lineWidth   = 1.5
  ctx.stroke()

  // Photo area
  const photoX = cardX + cardPad
  const photoY = cardTop + cardPad
  if (photo) {
    ctx.save()
    roundRectPath(ctx, photoX, photoY, photoSize, photoSize, 8)
    ctx.clip()
    drawImageCoverTransform(ctx, photo, photoX, photoY, photoSize, photoSize, photoZoom, photoOffsetX, photoOffsetY)
    ctx.restore()
  } else {
    roundRectPath(ctx, photoX, photoY, photoSize, photoSize, 8)
    ctx.fillStyle    = GREEN
    ctx.fill()
    ctx.fillStyle    = CREAM
    ctx.globalAlpha  = 0.45
    ctx.font         = `500 28px ${fontMono}`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('your photo here', centerX, photoY + photoSize / 2)
    ctx.globalAlpha  = 1
    ctx.textBaseline = 'top'
  }

  // Thin dark photo border
  roundRectPath(ctx, photoX, photoY, photoSize, photoSize, 8)
  ctx.strokeStyle = INK
  ctx.lineWidth   = 1.5
  ctx.stroke()

  // Card footer strip
  const stripMidY = photoY + photoSize + cardPad
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'middle'
  ctx.font         = `600 20px ${fontMono}`
  ctx.fillStyle    = GREEN_DEEP
  ctx.fillText('GOA, INDIA', photoX + 4, stripMidY + 16)
  ctx.textAlign = 'right'
  ctx.fillText('2:47 PM STUDIO', photoX + photoSize - 4, stripMidY + 16)
  ctx.textAlign = 'center'

  cy = cardTop + cardH + 36

  if (format === 'B') {
    const rawName   = (data.name || 'Anonymous Builder').trim()
    const parts     = rawName.split(/\s+/)
    const nameLines = parts.length > 1 ? [parts[0], parts.slice(1).join(' ')] : [rawName]
    const longestLine = nameLines.reduce((longest, line) =>
      ctx.measureText(line.toUpperCase()).width > ctx.measureText(longest.toUpperCase()).width
        ? line : longest,
      nameLines[0],
    )
    const nameSize = fitFontSize(ctx, longestLine.toUpperCase(), BADGE_W - 160, 76, 40, '800', fontSerif)
    ctx.font         = `800 ${nameSize}px ${fontSerif}`
    ctx.textBaseline = 'top'
    ctx.strokeStyle  = GREEN_DEEP
    ctx.lineWidth    = nameSize * 0.06
    ctx.lineJoin     = 'round'
    const lineGap    = 4
    nameLines.forEach((line, i) => ctx.strokeText(line.toUpperCase(), centerX, cy + i * (nameSize + lineGap)))
    ctx.fillStyle = MAGENTA
    nameLines.forEach((line, i) => ctx.fillText(line.toUpperCase(), centerX, cy + i * (nameSize + lineGap)))
    cy += nameLines.length * (nameSize + lineGap) + 8

    // Always reserve role space
    if (data.role) {
      const roleText = `> ${data.role}`
      const roleSize = fitFontSize(ctx, roleText, BADGE_W - 200, 30, 20, '500', fontMono)
      ctx.font      = `500 ${roleSize}px ${fontMono}`
      ctx.fillStyle = CREAM
      ctx.fillText(roleText, centerX, cy)
    }
    cy += 54

    if (data.title) {
      const chipText = data.title.toUpperCase()
      ctx.font       = `700 28px ${fontMono}`
      const chipPadX = 30
      const chipH    = 60
      const chipW    = Math.min(ctx.measureText(chipText).width + chipPadX * 2, BADGE_W - 140)
      roundRectPath(ctx, centerX - chipW / 2, cy, chipW, chipH, 10)
      ctx.fillStyle    = YELLOW
      ctx.fill()
      ctx.fillStyle    = INK
      ctx.textBaseline = 'middle'
      ctx.fillText(chipText, centerX, cy + chipH / 2 + 1)
      ctx.textBaseline = 'top'
      cy += chipH + 32
    }

    // Barcode — bare bars, no background
    cy += 16
    ctx.fillStyle = CREAM
    drawBarcode(ctx, (data.name || 'builder') + (data.role || ''), centerX, cy, 400, 60)

  } else {
    ctx.font      = `800 60px ${fontSerif}`
    ctx.fillStyle = CREAM
    ctx.fillText('LESS NOISE.', centerX, cy)
    cy += 66
    ctx.fillStyle = YELLOW
    ctx.fillText('MORE SIGNAL.', centerX, cy)
  }
}

function getBorderBackgroundColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  const counts = new Map<number, { count: number; r: number; g: number; b: number }>()
  const step = 8
  const addPixel = (x: number, y: number) => {
    const idx = (y * width + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    const saturation = Math.max(r, g, b) - Math.min(r, g, b)
    if (brightness > 240 || saturation > 40) return
    const key = (r << 16) | (g << 8) | b
    const existing = counts.get(key)
    if (existing) existing.count += 1
    else counts.set(key, { count: 1, r, g, b })
  }

  for (let x = 0; x < width; x += step) {
    addPixel(x, 0)
    addPixel(x, height - 1)
  }
  for (let y = 0; y < height; y += step) {
    addPixel(0, y)
    addPixel(width - 1, y)
  }

  let best: { count: number; r: number; g: number; b: number } | null = null
  for (const value of counts.values()) {
    if (!best || value.count > best.count) best = value
  }
  return best ? { r: best.r, g: best.g, b: best.b } : null
}

export function makeFrameOverlayTransparent(img: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const bgColor = getBorderBackgroundColor(imageData.data, canvas.width, canvas.height)
  if (!bgColor) return canvas

  const { r: bgR, g: bgG, b: bgB } = bgColor
  const threshold = 65 * 65
  for (let i = 0; i < imageData.data.length; i += 4) {
    const dr = imageData.data[i] - bgR
    const dg = imageData.data[i + 1] - bgG
    const db = imageData.data[i + 2] - bgB
    if (dr * dr + dg * dg + db * db < threshold) {
      imageData.data[i + 3] = 0
    }
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
