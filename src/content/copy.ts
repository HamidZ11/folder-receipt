// Every user-facing string lives here so it can be rewritten in one place.
// Tone: deadpan. Labels literal; humour only in the footer and discount captions.
// Lines marked TODO(Hamid) are placeholders waiting for his copy.

export const copy = {
  meta: {
    title: 'Folder Receipt',
  },
  dropZone: {
    title: 'Drop your folder here',
    subtitle: 'Everything stays on your device',
  },
  receiptSlot: {
    label: 'Receipt',
    empty: 'Your receipt prints here.',
  },
  privacy: {
    // Must stay true: enforced by the CSP in csp.ts / vercel.json.
    statement:
      'Your files are read in your browser and never uploaded. This page’s security policy blocks connections to any other site.',
  },
  receipt: {
    footer: {
      thanks: 'THANK YOU FOR SCANNING', // TODO(Hamid)
      keep: 'Please keep this receipt. Your files did.', // TODO(Hamid)
    },
    discountCaptions: {
      installers: 'Already installed. Still here.', // TODO(Hamid)
      duplicates: 'Same file. Bought twice.', // TODO(Hamid)
    },
  },
} as const;
