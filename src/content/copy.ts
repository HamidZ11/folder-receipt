// Every user-facing string lives here so it can be rewritten in one place.
// Tone: deadpan. Labels literal; humour only in the footer and discount captions.
// Lines marked TODO(Hamid) are placeholders waiting for his copy.

export const copy = {
  meta: {
    title: 'Folder Receipt: a printed receipt of any folder',
    description:
      'Drop a folder and get a receipt of what’s inside: the biggest files, leftover installers, duplicates and where your space went. Nothing leaves your browser.',
    ogImageAlt: 'A thermal receipt listing a Downloads folder: 1,210 files, 94.1 GB, total savings 6.8 GB.',
  },
  notFound: {
    title: 'Page not found',
    label: 'No such page',
    body: 'There’s nothing at this address.',
    back: 'Back to the receipt printer',
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
    filesFound: (count: number, n: string) => `${n} ${count === 1 ? 'file' : 'files'}`,
    scanned: (root: string, count: number, n: string) => `${root || 'Folder'}: ${n} ${count === 1 ? 'file' : 'files'}.`,
    empty: (root: string) => `${root || 'That folder'} has no files.`,
    skippedLead: 'Skipped',
    skipped: {
      dsStore: (n: string) => `${n} .DS_Store`,
      dotfiles: (n: string) => `${n} hidden`,
      nodeModules: (n: string) => `${n} node_modules`,
      git: (n: string) => `${n} .git`,
      unreadable: (n: string) => `${n} unreadable`,
    },
    // Safari never shows hidden files to the page, so these counts are unknown, not zero.
    notVisibleInSafari: 'hidden files and .git not visible in Safari',
    errors: {
      notAFolder: 'That’s a file. Drop a folder.',
      multiple: 'Drop one folder at a time.',
      unsupported: 'This browser can’t read dropped folders. Use “Choose a folder”.',
      unreadable: 'The browser couldn’t read that folder.',
    },
  },
  environment: {
    wordmark: 'FOLDER RECEIPT',
  },
  receiptSlot: {
    label: 'Receipt',
  },
  device: {
    // Tiny uppercase labels on the device (uppercase is CSS, so screen readers get normal case).
    input: 'Input',
    files: 'Files',
    status: 'Status',
    state: { ready: 'Ready', scanning: 'Scanning', printing: 'Printing', printed: 'Printed' },
    tearHint: 'Pull to tear off and save',
    exportGroup: 'Save as PNG',
  },
  export: {
    tallShort: 'Tall',
    squareShort: 'Square',
    namesShort: 'Names',
    showNames: 'Show file names',
    tall: 'Save tall PNG',
    square: 'Save square PNG',
    saving: 'Saving…',
    failed: 'Couldn’t save the image.',
    fileName: (no: string, shape: string) => `folder-receipt-${no}-${shape}.png`,
  },
  privacy: {
    // Both must stay true: enforced by the CSP in csp.ts / vercel.json.
    short: 'Nothing leaves your browser.',
    statement:
      'Your files are read in your browser and never uploaded. This page’s security policy blocks connections to any other site.',
  },
  receipt: {
    title: 'Folder receipt',
    number: (n: string) => `No. ${n}`,
    ariaLabel: (folder: string) => `Receipt for ${folder || 'folder'}`,
    folder: 'Folder',
    untitledFolder: 'Untitled folder',
    labels: {
      totalFiles: 'Total files',
      totalSize: 'Total size',
      notModified: 'Files not modified in a year',
      installers: 'Leftover installers',
      duplicates: 'Duplicates',
      totalSavings: 'Total savings',
    },
    sections: {
      items: 'Items',
      discounts: 'Discounts',
      breakdown: 'Where your space went',
    },
    none: '—',
    expand: {
      show: (n: string) => `List ${n}`,
      hide: 'Hide list',
      columns: { name: 'Name', size: 'Size', date: 'Modified' },
      tableLabel: (what: string) => `${what}: file list`,
    },
    empty: {
      items: 'No items.',
      breakdown: 'No space used.',
    },
    discountCaptions: {
      installers: 'Already installed. Still here.', // TODO(Hamid)
      duplicates: 'Same file. Bought twice.', // TODO(Hamid)
    },
    footer: {
      thanks: 'Thank you for scanning', // TODO(Hamid)
      keep: 'Keep this receipt. Your files did.',
      sample: 'Example receipt with fictional data',
    },
  },
} as const;
