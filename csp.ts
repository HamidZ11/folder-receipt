// Single source of truth for the Content Security Policy.
// Injected into the built index.html as a meta tag (vite.config.ts) and
// mirrored as real headers in vercel.json (checked by csp.test.ts).
// No file data can leave the page: connect-src only allows this origin.

export const CSP_DIRECTIVES: Record<string, string> = {
  'default-src': "'self'",
  'connect-src': "'self'",
  'img-src': "'self' data: blob:",
  'style-src': "'self'",
  'script-src': "'self'",
  'object-src': "'none'",
  'base-uri': "'none'",
  'form-action': "'none'",
};

/** Policy for the meta tag. frame-ancestors is ignored in meta, so it lives only in the header. */
export const CSP_META = Object.entries(CSP_DIRECTIVES)
  .map(([k, v]) => `${k} ${v}`)
  .join('; ');

/** Policy for the HTTP header (vercel.json). */
export const CSP_HEADER = `${CSP_META}; frame-ancestors 'none'`;
