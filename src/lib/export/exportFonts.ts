// The two families as same-origin woff2 URLs, for CSP-safe embedding in exports (fontFaceCss.ts).
import manrope400 from '@fontsource/manrope/files/manrope-latin-400-normal.woff2?url';
import manrope600 from '@fontsource/manrope/files/manrope-latin-600-normal.woff2?url';
import spaceMono400 from '@fontsource/space-mono/files/space-mono-latin-400-normal.woff2?url';
import spaceMono700 from '@fontsource/space-mono/files/space-mono-latin-700-normal.woff2?url';
import type { ExportFontFace } from './fontFaceCss.ts';

export const EXPORT_FONTS: readonly ExportFontFace[] = [
  { family: 'Space Mono', weight: 400, url: spaceMono400 },
  { family: 'Space Mono', weight: 700, url: spaceMono700 },
  { family: 'Manrope', weight: 400, url: manrope400 },
  { family: 'Manrope', weight: 600, url: manrope600 },
];
