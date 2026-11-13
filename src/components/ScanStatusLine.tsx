import { copy } from '../content/copy.ts';
import type { Receipt, ScanStatus } from '../hooks/useFolderScan.ts';
import { hidesDotfiles } from '../lib/browser.ts';
import { formatCount } from '../lib/stats/format.ts';
import type { SkipCounts } from '../lib/stats/types.ts';

const SKIP_ORDER: (keyof SkipCounts)[] = ['dsStore', 'dotfiles', 'nodeModules', 'git', 'unreadable'];
const INVISIBLE_IN_SAFARI = new Set<keyof SkipCounts>(['dsStore', 'dotfiles', 'git']);
const SAFARI = hidesDotfiles();

/** Scan state, outside the receipt. Polite live region so screen readers hear the result. */
export function ScanStatusLine({ status, receipt }: { status: ScanStatus; receipt: Receipt }) {
  return (
    <p role="status" aria-live="polite" data-testid="scan-status" className="mt-4 min-h-10 text-small text-text-muted">
      <Message status={status} receipt={receipt} />
    </p>
  );
}

function Message({ status, receipt }: { status: ScanStatus; receipt: Receipt }) {
  if (status.phase === 'scanning') {
    return (
      <>
        {copy.status.scanning(status.rootName)}{' '}
        <span className="num text-text">{copy.status.filesFound(status.seen, formatCount(status.seen))}</span>
      </>
    );
  }
  if (status.phase === 'error') {
    return <span className="text-danger">{copy.status.errors[status.error]}</span>;
  }
  if (receipt.source === 'sample') return <>{copy.status.sample}</>;

  const { scan, stats } = receipt;
  const parts = SKIP_ORDER.filter((k) => scan.skipped[k] > 0 && !(SAFARI && INVISIBLE_IN_SAFARI.has(k))).map((k) =>
    copy.status.skipped[k](formatCount(scan.skipped[k])),
  );
  if (SAFARI) parts.push(copy.status.notVisibleInSafari);
  const skipped = parts.join(', ');
  return (
    <>
      <span className="num">
        {stats.totalFiles === 0
          ? copy.status.empty(scan.rootName)
          : copy.status.scanned(scan.rootName, stats.totalFiles, formatCount(stats.totalFiles))}
      </span>
      {skipped && (
        <>
          <br />
          <span className="num">
            {copy.status.skippedLead}: {skipped}.
          </span>
        </>
      )}
    </>
  );
}
