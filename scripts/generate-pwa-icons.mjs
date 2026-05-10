import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
/** PWA icons: use `logo.jpeg` only (not logo-bg2.png). */
const source = join(root, 'src', 'assets', 'logo.jpeg')
const outDir = join(root, 'public', 'icons')

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

console.info('Wrote public/icons/icon-192.png and public/icons/icon-512.png from src/assets/logo.jpeg')
