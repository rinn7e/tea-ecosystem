// Safari on a Mac: an iPad asks for the desktop page with the same user
// agent, and only its touch points tell it apart. Chrome, Edge and Firefox
// on a Mac name no `Version/` before `Safari/`.
export const isMacSafari = (
  userAgent: string,
  maxTouchPoints: number,
): boolean =>
  userAgent.includes('Macintosh') &&
  /Version\/\S+ Safari\//.test(userAgent) &&
  maxTouchPoints === 0
