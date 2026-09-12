import { requireOwner } from '@/lib/auth';
import type { ThinkPadEntry } from '@/lib/think-pad';
import { ThinkPadDoc } from './ThinkPadDoc';
import { FormError, PageHead } from '@/components/ui';

export default async function ThinkPadPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	const { data: entries } = await supabase
		.from('think_pad_entries')
		.select('*')
		.order('position', { ascending: true });

	const typedEntries = (entries ?? []) as ThinkPadEntry[];

	return (
		<section className="max-w-[720px]">
			<PageHead
				eyebrow="Personal"
				title="Think Pad."
				lede="One running document. Click anywhere to write; Enter for a new line, Backspace to merge it with the one above. Tell Claude to save a thought and it lands at the bottom, same as if you'd typed it."
			/>

			{error && <FormError>{error}</FormError>}

			<ThinkPadDoc initialLines={typedEntries} />
		</section>
	);
}
