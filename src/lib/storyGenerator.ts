/**
 * Générateur d'images "Story" 9:16 (1080×1920) pour partage WhatsApp /
 * Instagram / Facebook. Aucune dépendance externe — utilise Canvas 2D natif.
 */

interface StoryTeam {
  name: string
  shortName: string
  color: string
  logoUrl?: string | null
  score?: number
}

interface MatchStoryOptions {
  home: StoryTeam
  away: StoryTeam
  title?: string
  subtitle?: string
  highlight?: string
  footer?: string
  status?: 'live' | 'completed' | 'scheduled'
  liveMinute?: string
}

const W = 1080
const H = 1920

const FONT_DISPLAY = "'Barlow Condensed', 'Impact', sans-serif"
const FONT_BODY = "'Barlow', system-ui, sans-serif"

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3): number {
  const words = text.split(' ')
  let line = ''
  let lines: string[] = []
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
    if (lines.length >= maxLines) break
  }
  if (line && lines.length < maxLines) lines.push(line)
  lines.slice(0, maxLines).forEach((l, i) => {
    ctx.fillText(l, x, y + i * lineHeight)
  })
  return y + lines.length * lineHeight
}

/**
 * Génère une image PNG 9:16 (1080×1920) résumant un match.
 * Retourne un Blob et déclenche le téléchargement via `download`.
 */
export async function generateMatchStory(opts: MatchStoryOptions): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Fond dégradé sombre
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#0D1117')
  grad.addColorStop(1, '#161B22')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Bande d'accent en haut
  ctx.fillStyle = '#C8F135'
  ctx.fillRect(0, 0, W, 8)

  // Logo / titre
  ctx.fillStyle = '#fff'
  ctx.font = `bold 56px ${FONT_DISPLAY}`
  ctx.textAlign = 'center'
  ctx.fillText('LEAGUE H5', W / 2, 160)

  if (opts.title) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = `600 38px ${FONT_BODY}`
    ctx.fillText(opts.title.toUpperCase(), W / 2, 220)
  }

  // Pastille statut
  const statusLabel = opts.status === 'live'
    ? `EN DIRECT · ${opts.liveMinute ?? ''}`
    : opts.status === 'completed'
      ? 'RÉSULTAT FINAL'
      : 'À VENIR'
  const pillW = 480
  const pillX = (W - pillW) / 2
  ctx.fillStyle = opts.status === 'live' ? '#DC2626' : 'rgba(255,255,255,0.1)'
  roundedRect(ctx, pillX, 260, pillW, 80, 40)
  ctx.fill()
  ctx.fillStyle = opts.status === 'live' ? '#fff' : 'rgba(255,255,255,0.8)'
  ctx.font = `900 36px ${FONT_DISPLAY}`
  ctx.textAlign = 'center'
  ctx.fillText(statusLabel, W / 2, 315)

  // Bloc score
  drawTeamRow(ctx, opts.home, 480, opts.home.score)
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = `900 220px ${FONT_DISPLAY}`
  ctx.textAlign = 'center'
  ctx.fillText('–', W / 2, 880)
  drawTeamRow(ctx, opts.away, 1000, opts.away.score)

  // Highlight (buteur du match / phrase)
  if (opts.highlight) {
    ctx.fillStyle = '#C8F135'
    ctx.font = `italic 600 44px ${FONT_BODY}`
    ctx.textAlign = 'center'
    wrapText(ctx, `« ${opts.highlight} »`, W / 2, 1280, W - 120, 56, 2)
  }

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = `500 32px ${FONT_BODY}`
  ctx.textAlign = 'center'
  if (opts.subtitle) ctx.fillText(opts.subtitle, W / 2, 1620)
  if (opts.footer) ctx.fillText(opts.footer, W / 2, 1700)

  // Mention branding
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = `bold 28px ${FONT_DISPLAY}`
  ctx.fillText('leagueh5.app', W / 2, 1840)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas toBlob a échoué'))
    }, 'image/png', 0.92)
  })
}

async function drawTeamRow(
  ctx: CanvasRenderingContext2D,
  team: StoryTeam,
  y: number,
  score?: number,
) {
  const rowW = W - 120
  const rowX = 60
  const rowH = 360

  // Carte
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  roundedRect(ctx, rowX, y, rowW, rowH, 32)
  ctx.fill()

  // Bande couleur
  ctx.fillStyle = team.color || '#888'
  roundedRect(ctx, rowX, y, 18, rowH, 16)
  ctx.fill()

  // Logo
  const logoBox = { x: rowX + 60, y: y + 60, w: 200, h: 200 }
  if (team.logoUrl) {
    const img = await loadImage(team.logoUrl)
    if (img) {
      ctx.save()
      roundedRect(ctx, logoBox.x, logoBox.y, logoBox.w, logoBox.h, 24)
      ctx.clip()
      ctx.drawImage(img, logoBox.x, logoBox.y, logoBox.w, logoBox.h)
      ctx.restore()
    } else {
      drawLogoPlaceholder(ctx, team, logoBox)
    }
  } else {
    drawLogoPlaceholder(ctx, team, logoBox)
  }

  // Nom équipe
  ctx.fillStyle = '#fff'
  ctx.font = `900 84px ${FONT_DISPLAY}`
  ctx.textAlign = 'left'
  const nameMaxW = rowW - logoBox.w - 240
  wrapText(ctx, team.shortName.toUpperCase(), logoBox.x + logoBox.w + 30, y + 170, nameMaxW, 90, 2)

  // Score
  if (score !== undefined) {
    ctx.fillStyle = '#C8F135'
    ctx.font = `900 220px ${FONT_DISPLAY}`
    ctx.textAlign = 'right'
    ctx.fillText(String(score), rowX + rowW - 40, y + 230)
  }
}

function drawLogoPlaceholder(ctx: CanvasRenderingContext2D, team: StoryTeam, box: { x: number; y: number; w: number; h: number }) {
  ctx.fillStyle = team.color || '#444'
  roundedRect(ctx, box.x, box.y, box.w, box.h, 24)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = `900 110px ${FONT_DISPLAY}`
  ctx.textAlign = 'center'
  ctx.fillText(team.shortName.slice(0, 2).toUpperCase(), box.x + box.w / 2, box.y + box.h / 2 + 36)
}

/** Télécharge un Blob côté navigateur. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Partage un Blob via Web Share API (si supporté), sinon télécharge. */
export async function shareOrDownload(blob: Blob, filename: string, shareText: string) {
  const file = new File([blob], filename, { type: blob.type })
  if (typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator) {
    try {
      const navAny = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean
        share?: (data: ShareData) => Promise<void>
      }
      if (navAny.canShare?.({ files: [file] })) {
        await navAny.share?.({ files: [file], text: shareText, title: 'League H5' })
        return
      }
    } catch {
      // l'utilisateur a annulé ou l'API a échoué : fallback téléchargement
    }
  }
  downloadBlob(blob, filename)
}
