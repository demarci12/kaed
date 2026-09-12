import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { NewPagePopup } from '../NewPagePopup';
import { PageHead } from '@/components/ui';

/** Landing spot for a [[Wiki Link]] to a page that doesn't exist yet -- the
 *  "create this page" dialog opens immediately, prefilled with the title
 *  that was linked to. */
export default async function NewThinkPadPageFromLink({ searchParams }: {
	searchParams: Promise<{ title?: string }>;
}) {
	await requireOwner();
	const { title } = await searchParams;

	return (
		<section className="max-w-[720px]">
			<PageHead eyebrow="Personal" title="Create this page?" />
			<p className="mt-3 text-muted">
				<Link href="/think-pad" className="text-ink hover:underline">← Think Pad</Link>
			</p>
			<div className="mt-6">
				<NewPagePopup defaultTitle={title} />
			</div>
		</section>
	);
}
