import { PageHead } from '@/components/ui';
import { requireOwner } from '@/lib/auth';
import { todayInBudapest, weekStart, type WorkTask } from '@/lib/work';
import { withStats } from '@/lib/work-server';
import { AutomationGuide } from './AutomationGuide';
import { TaskGrid } from './TaskGrid';

export default async function WorkPage() {
	const { supabase } = await requireOwner();

	const today = todayInBudapest();
	const monday = weekStart(today);
	const [{ data: rows }, { data: logRows }] = await Promise.all([
		supabase.from('work_tasks').select('*').order('no', { ascending: true }),
		supabase.from('work_logs').select('logged_on, hours').gte('logged_on', monday),
	]);

	const tasks = await withStats(supabase, (rows ?? []) as WorkTask[]);
	const logs = (logRows ?? []) as { logged_on: string; hours: number | string }[];
	const sum = (list: typeof logs) => Math.round(list.reduce((a, l) => a + Number(l.hours), 0) * 100) / 100;

	return (
		<section>
			<PageHead
				eyebrow="Knorr-Bremse"
				title="Work."
				lede="Your day-to-day tickets as an open point list. Click any cell to edit it, open a row for the description, comments and time log, or paste rows in from Jira or Excel."
			/>
			<TaskGrid initial={tasks} hoursToday={sum(logs.filter((l) => l.logged_on === today))} hoursWeek={sum(logs)} />
			<AutomationGuide />
		</section>
	);
}
