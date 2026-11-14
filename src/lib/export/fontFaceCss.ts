// CSP-safe web fonts for PNG export.
//
// modern-screenshot's default font embedding builds a scratch HTML document
// and inserts an inline <style> into it. That document inherits this page's
// CSP (style-src 'self'), so the style is blocked and export fails. Passing
// `font: { cssText }` skips that path and writes the CSS straight into the
// SVG it renders as an image, which no page CSP applies to. So: fetch our own
// same-origin woff2 files (connect-src 'self'), inline them as data: URLs in
// @font-face rules, and hand modern-screenshot the CSS. The CSP is unchanged.

export type ExportFontFace = { family: string; weight: number; url: string };

const cache = new Map<string, Promise<string>>();

function toDataUrl(url: string): Promise<string> {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Font fetch failed: ${url}`);
        return r.blob();
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).replace(/^data:[^;,]*/, 'data:font/woff2'));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          }),
      );
    cache.set(url, p);
  }
  return p;
}

export async function fontFaceCss(faces: readonly ExportFontFace[]): Promise<string> {
  const rules = await Promise.all(
    faces.map(
      async (f) =>
        `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};font-display:block;src:url(${await toDataUrl(f.url)}) format('woff2');}`,
    ),
  );
  return rules.join('\n');
}
