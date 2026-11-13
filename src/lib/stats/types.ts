export type FileKind = 'file' | 'bundle';

export type FileRecord = {
  /** Path relative to the dropped root, '/'-separated, includes the name. */
  path: string;
  /** Basename. */
  name: string;
  /** Lower-case extension without the dot; '' if none. */
  ext: string;
  /** Bytes. For a bundle, the sum of its contents. */
  size: number;
  /** ms since epoch. For a bundle, the newest child. */
  lastModified: number;
  kind: FileKind;
};

export type SkipCounts = {
  /** .DS_Store files. */
  dsStore: number;
  /** Other hidden files, and files inside hidden folders. */
  dotfiles: number;
  /** node_modules folders (not walked into). */
  nodeModules: number;
  /** .git folders (not walked into). */
  git: number;
};

export type ScanResult = {
  rootName: string;
  files: FileRecord[];
  skipped: SkipCounts;
  /** ms since epoch; also "now" for the not-modified-in-a-year cutoff. */
  scannedAt: number;
};

export const CATEGORIES = [
  'Videos',
  'Images',
  'Audio',
  'Documents',
  'Archives',
  'Installers',
  'Apps',
  'Other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export type BreakdownSegment = { category: Category; bytes: number; percent: number };

export type DuplicateGroup = {
  /** Normalised name shared by the group, e.g. "report.pdf". */
  name: string;
  size: number;
  files: FileRecord[];
  /** (count − 1) × size */
  reclaimable: number;
};

export type ReceiptStats = {
  receiptNo: string;
  scannedAt: number;
  folderName: string;
  totalFiles: number;
  totalBytes: number;
  largest: FileRecord | null;
  notModifiedInAYear: FileRecord[];
  items: FileRecord[];
  installers: FileRecord[];
  duplicateGroups: DuplicateGroup[];
  totalSavings: number;
  breakdown: BreakdownSegment[];
  skipped: SkipCounts;
};

export const emptySkipCounts = (): SkipCounts => ({ dsStore: 0, dotfiles: 0, nodeModules: 0, git: 0 });
