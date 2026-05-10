import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
/**
 * PWA launcher icons (`public/icons/*.png`) and the public header/footer logo (`samarth-logo.png`)
 * are derived from `src/assets/logo.jpeg` only (not logo-bg2.png).
 * That file may include Flaticon-licensed graphics — attribution is surfaced in Settings.
 */
const source = join(root, 'src', 'assets', 'logo.jpeg')
const outDir = join(root, 'public', 'icons')
const headerLogoOut = join(root, 'public', 'samarth-logo.png')

/** Matches white background on the brand JPEG */
const BG = '#ffffff'

await access(source)

await mkdir(outDir, { recursive: true })

const resize = async (size, outfile) =>
  sharp(source)
    .resize(size, size, {
      fit: 'contain',
      background: BG,
      position: 'centre',
    })
    .png()
    .toFile(outfile)

await resize(192, join(outDir, 'icon-192.png'))
await resize(512, join(outDir, 'icon-512.png'))

/** Retina-friendly raster for `<img src="/samarth-logo.png">`; matches PWA/mark brand source. */
await sharp(source)
  .resize({ height: 160, fit: 'inside', background: BG, position: 'centre' })
  .png()
  .toFile(headerLogoOut)

console.info(
  'Wrote public/icons/icon-*.png and public/samarth-logo.png from src/assets/logo.jpeg',
)
