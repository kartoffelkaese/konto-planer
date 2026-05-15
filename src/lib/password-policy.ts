export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Das Passwort muss mindestens 8 Zeichen lang sein'
  }
  if (password.length > 128) {
    return 'Das Passwort darf maximal 128 Zeichen lang sein'
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Das Passwort muss mindestens einen Buchstaben enthalten'
  }
  if (!/[0-9]/.test(password)) {
    return 'Das Passwort muss mindestens eine Ziffer enthalten'
  }
  return null
}
