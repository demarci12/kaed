import { requireOwner } from '@/lib/auth';
import type { ThinkPadEntry } from '@/lib/think-pad';
import { InlineEdit } from '@/components/InlineEdit';
import { CardItem, CardList, RemoveButton } from '@/components/CardList';
import { NewEntryPopup } from './NewEntryPopup';
import {
	cardDate, cardValue, chipMuted, deleteBtn, Empty, FormError, PageHead,
} from '@/components/ui';

const entry = 'flex flex-col gap-2 py-6 border-b border-line last:border-b-0';
const entryHead = 'flex items-start justify-between gap-3';
const entryTitle = 'flex-1 min-w-0 font-serif text-lg font-semibold leading-tight text-ink no-underline';

export default async function ThinkPadPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	const { data: entries } = await supabase
		.from('think_pad_entries')
		.select('*')
		.order('created_at', { ascending: false });

	const typedEntries = (entries ?? []) as ThinkPadEntry[];

	return (
		<section className="max-w-[720px]">
			<PageHead
				eyebrow="Personal"
				title="Think Pad."
				lede="A running journal. Write here, or tell Claude to save a thought and it lands in the same stream."
				actions={<NewEntryPopup />}
			/>

			{error && <FormError>{error}</FormError>}

			<CardList as="div" className="mt-10">
				{typedEntries.length ? (
					typedEntries.map((item) => (
						<CardItem key={item.id} id={item.id} as="article" className={entry}>
							<div className={entryHead}>
								<InlineEdit
									value={item.title ?? ''}
									field="title"
									id={item.id}
									endpoint="/api/think-pad"
									className={entryTitle}
									placeholder="Untitled"
								/>
								<div className="flex items-center gap-2 shrink-0">
									{item.source === 'mcp' && <span className={chipMuted} title="Saved by Claude">💬 Claude</span>}
									<span className={cardDate}>
										{new Date(item.created_at).toLocaleString(undefined, {
											month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
										})}
									</span>
									<RemoveButton
										id={item.id}
										endpoint={`/api/think-pad/${item.id}/delete`}
										className={deleteBtn}
										ariaLabel="Delete thought"
									>×</RemoveButton>
								</div>
							</div>

							<InlineEdit
								value={item.body}
								field="body"
								id={item.id}
								endpoint="/api/think-pad"
								kind="textarea"
								className={`block ${cardValue} text-[15px]`}
							/>
						</CardItem>
					))
				) : (
					<Empty>Nothing here yet. Write your first thought, or tell Claude to save one.</Empty>
				)}
			</CardList>
		</section>
	);
}
