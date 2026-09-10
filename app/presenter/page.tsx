import type { Metadata } from 'next';
import { Presenter } from '@/components/presenter/Presenter';

export const metadata: Metadata = {
  title: 'Presenter — Dozer.ai walkthrough',
  robots: { index: false, follow: false },
};

/**
 * Opened with P from the stage, into its own window. Drives the stage and is
 * driven by it over a BroadcastChannel, so whichever window has focus, the
 * arrows work.
 */
export default function PresenterPage() {
  return <Presenter />;
}
