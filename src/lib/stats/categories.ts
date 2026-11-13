import type { Category, FileRecord } from './types.ts';

const INSTALLER_EXTS = new Set(['dmg', 'pkg', 'exe', 'msi']);

const BY_EXT: Record<string, Category> = {};
const add = (cat: Category, exts: string) => {
  for (const e of exts.split(' ')) BY_EXT[e] = cat;
};
add('Videos', 'mp4 mov m4v avi mkv webm wmv flv mpg mpeg 3gp mts');
add('Images', 'jpg jpeg png gif heic heif webp tif tiff bmp svg raw cr2 cr3 nef arw dng psd ai ico photoslibrary');
add('Audio', 'mp3 m4a wav aac flac ogg oga aiff aif opus mid midi');
add('Documents', 'pdf doc docx xls xlsx ppt pptx key pages numbers txt rtf md csv tsv odt ods odp epub');
add('Archives', 'zip rar 7z tar gz tgz bz2 xz zst');
add('Installers', [...INSTALLER_EXTS].join(' '));
add('Apps', 'app');

export function categoryOf(f: FileRecord): Category {
  return BY_EXT[f.ext] ?? 'Other';
}

export function isInstaller(f: FileRecord): boolean {
  return f.kind === 'file' && INSTALLER_EXTS.has(f.ext);
}
