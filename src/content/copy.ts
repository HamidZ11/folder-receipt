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
    button: 'Choose a folder',
    noFolderAccess: 'Folder scanning needs a computer. This is a sample receipt.',
  },
  status: {
    sample: 'Showing a sample folder.',
    scanning: (root: string) => `Scanning ${root || 'folder'}…`,
    filesFound: (n: string) => `${n} files`,
    scanned: (root: string, n: string) => `${root || 'Folder'}: ${n} files.`,
    empty: (root: string) => `${root || 'That folder'} has no files.`,
    skippedLead: 'Skipped',
    skipped: {
      dsStore: (n: string) => `${n} .DS_Store`,
      dotfiles: (n: string) => `${n} hidden`,
      nodeModules: (n: string) => `${n} node_modules`,
      git: (n: string) => `${n} .git`,
      unreadable: (n: string) => `${n} unreadable`,
    },
    errors: {
      notAFolder: 'That’s a file. Drop a folder.',
      multiple: 'Drop one folder at a time.',
      unsupported: 'This browser can’t read dropped folders. Use “Choose a folder”.',
      unreadable: 'The browser couldn’t read that folder.',
    },
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
