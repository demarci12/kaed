import type { Metadata } from 'next';
import { dayKind, HYROX_KEY, HYROX_RACE_NOTES, HYROX_WEEKS, KIND_LABEL, tasksOf, withPaces } from '@/lib/hyrox';
import { PageHead } from '@/components/ui';
import { HyroxPlan, type PlanWeek } from './HyroxPlan';

// Public (no login) but kept out of search engines: the content is a
// transcription of a paid plan, shared by link only.
export const metadata: Metadata = {
	title: 'Hyrox 12-week plan · KAED',
	robots: { index: false, follow: false },
};

/**
 * The 12-week Hyrox plan, every week and every task on one page. Static data
 * from lib/hyrox.ts, no database, no auth check. The server splits each day
 * into tasks and resolves the running paces; `HyroxPlan` (client) adds the
 * ticks, saved per browser.
 */
export default function HyroxPage() {
	const weeks: PlanWeek[] = HYROX_WEEKS.map((w) => ({
		week: w.week,
		label: w.label,
		days: w.days.map((d) => {
			const kind = dayKind(d.title);
			return {
				day: d.day, title: d.title, duration: d.duration, kindLabel: KIND_LABEL[kind],
				tasks: tasksOf(d).map((t) => ({
					...t,
					name: withPaces(t.name),
					detail: t.detail && withPaces(t.detail),
				})),
			};
		}),
	}));

	return (
		<section className="max-w-[1120px]">
			<PageHead
				eyebrow="Hyrox · 12 weeks"
				title="Hyrox 12-week plan"
				lede="5 sessions a week, Days 1–60. Week 7 is a deload, Week 12 is race week. Blocks the recordings never showed are marked (not shown)."
			/>

			<HyroxPlan weeks={weeks} />

			<div data-theme="hyrox" className="mt-10 flex flex-col gap-3 text-base-content">
				<details className="collapse collapse-arrow bg-base-100 border border-base-300">
					<summary className="collapse-title font-semibold">How to read the plan</summary>
					<div className="collapse-content">
						<ul className="m-0 pl-5 list-disc flex flex-col gap-1.5 text-sm leading-relaxed opacity-80">
							{HYROX_KEY.map((k) => <li key={k}>{k}</li>)}
							<li>Required tasks make up the session. Optional ones are extra warm-ups and cool-downs: do them if you have the time.</li>
						</ul>
					</div>
				</details>
				<div id="race" className="card bg-base-100 border border-base-300 scroll-mt-16">
					<div className="card-body">
						<h2 className="card-title">Using it for your April race</h2>
						<ul className="m-0 pl-5 list-disc flex flex-col gap-1.5 text-sm leading-relaxed opacity-80">
							{HYROX_RACE_NOTES.map((n) => <li key={n}>{n}</li>)}
						</ul>
						<p className="m-0 text-xs opacity-50">Personal training reference, transcribed from the Hyrox Mastery Elite plan (Endurance app).</p>
					</div>
				</div>
			</div>
		</section>
	);
}
