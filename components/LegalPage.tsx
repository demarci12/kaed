import type { ReactNode } from 'react';
import { PageHead } from '@/components/ui';

export const LEGAL_CONTACT = 'demarci12@gmail.com';
export const LEGAL_UPDATED = '2 October 2026';

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="max-w-[720px]">
			<PageHead eyebrow="KAED" title={title} lede={`Last updated ${LEGAL_UPDATED}.`} />
			<div className="mt-10 flex flex-col gap-8 leading-relaxed [&_h2]:m-0 [&_h2]:mb-2 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-semibold [&_p]:m-0">
				{children}
			</div>
		</section>
	);
}
