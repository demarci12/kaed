import { requireOwner } from '@/lib/auth';
import type { Goal } from '@/lib/goals';
import { FormError, PageHead } from '@/components/ui';
import { GoalGrid } from './GoalGrid';
import { NewGoalPopup } from './NewGoalPopup';

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	const { data: goals } = await supabase.from('goals').select('*').order('rank', { ascending: true });
	const typedGoals = (goals ?? []) as Goal[];

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Personal"
				title="Goals."
				lede="What you're working toward. Drag a card by its handle to reorder — top of the list is the priority."
				actions={<NewGoalPopup />}
			/>

			{error && <FormError>{error}</FormError>}

			<GoalGrid goals={typedGoals} />
		</section>
	);
}
