export function getContrastColor(hexcolor: string) {
  // Entferne das #-Zeichen, falls vorhanden
  const hex = hexcolor.replace('#', '')
  
  // Konvertiere zu RGB
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Berechne die relative Helligkeit
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  
  // Wenn die Helligkeit über 128 liegt, verwende schwarzen Text, sonst weißen
  return brightness > 128 ? '#000000' : '#FFFFFF'
} 