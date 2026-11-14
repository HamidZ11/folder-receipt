import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { copy } from './content/copy.ts';
import './styles/fonts.ts';
import './styles/index.css';

/** 404: the device's look, one way back. Served by Vercel for any unknown path. */
function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-receipt flex-col justify-center px-(--page-gutter) py-16">
      <section className="rounded-(--radius-device) border border-(--color-box-line) bg-(--color-box) px-6 py-8 text-(--color-box-text)">
        <p className="text-label tracking-(--label-tracking) text-(--color-box-muted) uppercase">{copy.notFound.label}</p>
        <h1 className="mt-6 text-title font-semibold tracking-tight">{copy.notFound.title}</h1>
        <p className="text-small text-(--color-box-muted)">{copy.notFound.body}</p>
        <a
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-control bg-(--color-button) px-5 text-small font-semibold text-(--color-button-text)"
        >
          {copy.notFound.back}
        </a>
      </section>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('#root missing from 404.html');
createRoot(root).render(
  <StrictMode>
    <NotFound />
  </StrictMode>,
);
