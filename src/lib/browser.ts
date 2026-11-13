/**
 * Safari (macOS and iOS) leaves hidden files out of both folder drag-and-drop and
 * <input webkitdirectory>: .DS_Store, dotfiles, hidden folders and .git never
 * reach the page. Verified by hand on 13 Nov 2026. Chromium and Firefox list them.
 */
export function hidesDotfiles(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  return /Safari\//.test(ua) && !/Chrome\/|Chromium\/|CriOS\/|FxiOS\/|Edg\/|EdgiOS\/|OPR\/|Android/.test(ua);
}
