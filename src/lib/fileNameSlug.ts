/** Dateisichere Form eines Namens: ohne Akzente, nur Buchstaben, Ziffern und Bindestriche, klein */
export function fileNameSlug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}
