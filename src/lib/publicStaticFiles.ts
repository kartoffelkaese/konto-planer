/** Statische Dateien aus public/ und Metadaten-Dateien – ohne Login (OG-Bild, Icons, Manifest, …). */
export const PUBLIC_STATIC_FILE = /\.(?:png|svg|ico|jpg|jpeg|webp|woff2?|webmanifest)$/i

export function isPublicStaticFile(pathname: string): boolean {
  return PUBLIC_STATIC_FILE.test(pathname)
}
