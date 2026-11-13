import { SITE_URL } from '../../config.ts';
import { copy } from '../../content/copy.ts';
import { isInstaller } from '../../lib/stats/categories.ts';
import { formatBytes, formatCount, formatDateTime } from '../../lib/stats/format.ts';
import type { ReceiptStats } from '../../lib/stats/types.ts';
import { Breakdown } from './Breakdown.tsx';
import { MiddleTruncate } from './MiddleTruncate.tsx';
import { Divider, Row, SectionLabel } from './parts.tsx';

const minus = (n: number) => (n > 0 ? `−${formatBytes(n)}` : formatBytes(0)); // U+2212

export function Receipt({ stats, sample }: { stats: ReceiptStats; sample: boolean }) {
  const t = copy.receipt;
  const folder = stats.folderName || t.untitledFolder;
  const dupCopies = stats.duplicateGroups.reduce((n, g) => n + g.files.slice(1).filter((f) => !isInstaller(f)).length, 0);

  return (
    <article
      aria-label={t.ariaLabel(folder)}
      className="rounded-card bg-paper px-5 py-6 text-body text-ink shadow-paper sm:px-6"
    >
      {/* Header */}
      <header>
        <div data-row className="flex items-baseline justify-between gap-4">
          <h2 className="text-label font-semibold uppercase">{t.title}</h2>
          <span className="num shrink-0 text-small text-ink-muted">{t.number(stats.receiptNo)}</span>
        </div>
        <p data-row className="num text-small text-ink-muted">
          {formatDateTime(stats.scannedAt)}
        </p>
        <dl className="mt-3">
          <Row shrinkValue label={t.folder} value={<MiddleTruncate text={folder} />} />
        </dl>
      </header>

      <Divider />

      {/* Summary */}
      <dl>
        <Row label={t.labels.totalFiles} value={formatCount(stats.totalFiles)} />
        <Row label={t.labels.totalSize} value={formatBytes(stats.totalBytes)} />
        <Row label={t.labels.largest} value={stats.largest ? formatBytes(stats.largest.size) : t.none} />
      </dl>
      {stats.largest && (
        // The name gets its own line so it isn't squeezed by the label and size.
        <p data-row className="-mt-0.5 pb-0.5 text-right text-small text-ink-muted">
          <MiddleTruncate text={stats.largest.name} />
        </p>
      )}
      <dl>
        <Row label={t.labels.notModified} value={formatCount(stats.notModifiedInAYear.length)} />
      </dl>

      <Divider />

      {/* Items: top 5 largest, priced by size */}
      <section>
        <SectionLabel>{t.sections.items}</SectionLabel>
        {stats.items.length === 0 ? (
          <p data-row className="text-ink-muted">
            {t.empty.items}
          </p>
        ) : (
          <dl>
            {stats.items.map((f) => (
              <ItemRow key={f.path} name={f.name} size={f.size} />
            ))}
          </dl>
        )}
      </section>

      <Divider />

      {/* Discounts */}
      <section>
        <SectionLabel>{t.sections.discounts}</SectionLabel>
        <dl>
          <Row
            label={
              <>
                {t.labels.installers} <span className="num">({formatCount(stats.installers.length)})</span>
              </>
            }
            value={minus(stats.installerBytes)}
          />
        </dl>
        {stats.installers.length > 0 && <Caption>{t.discountCaptions.installers}</Caption>}
        <dl className="mt-2">
          <Row
            label={
              <>
                {t.labels.duplicates} <span className="num">({formatCount(dupCopies)})</span>
              </>
            }
            value={minus(stats.duplicateBytes)}
          />
        </dl>
        {dupCopies > 0 && <Caption>{t.discountCaptions.duplicates}</Caption>}
      </section>

      <Divider />

      <dl>
        <Row
          className="text-total font-semibold"
          label={t.labels.totalSavings}
          value={formatBytes(stats.totalSavings)}
        />
      </dl>

      <Divider />

      <Breakdown segments={stats.breakdown} />

      <Divider />

      <footer className="text-center">
        <p data-row className="text-label font-medium uppercase">
          {t.footer.thanks}
        </p>
        <p data-row className="text-small text-ink-muted">
          {t.footer.keep}
        </p>
        {sample && (
          <p data-row className="text-small text-ink-muted">
            {t.footer.sample}
          </p>
        )}
        <p data-row className="mt-3 text-small">
          {SITE_URL}
        </p>
      </footer>
    </article>
  );
}

function ItemRow({ name, size }: { name: string; size: number }) {
  return (
    <div data-row className="flex items-baseline justify-between gap-4 py-0.5">
      <dt className="min-w-0 flex-1">
        <MiddleTruncate text={name} />
      </dt>
      <dd className="num shrink-0 text-right">{formatBytes(size)}</dd>
    </div>
  );
}

function Caption({ children }: { children: string }) {
  return (
    <p data-row className="text-small text-ink-muted">
      {children}
    </p>
  );
}
