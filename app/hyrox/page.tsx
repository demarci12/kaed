import type { Metadata } from 'next';
import { dayKind, HYROX_KEY, HYROX_RACE_NOTES, HYROX_WEEKS, KIND_LABEL, tasksOf, withPaces } from '@/lib/hyrox';
import { card, guideList, guideText, guideTitle, PageHead } from '@/components/ui';
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
				day: d.day, title: d.title, duration: d.duration, kind, kindLabel: KIND_LABEL[kind],
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

			<details className={`${card} mt-12 group`}>
				<summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
					<h2 className={guideTitle}>How to read the plan</h2>
					<span className="text-xs text-muted group-open:rotate-180 transition-transform">▾</span>
				</summary>
				<ul className={`${guideList} mt-3`}>
					{HYROX_KEY.map((k) => <li key={k}>{k}</li>)}
					<li>Required tasks make up the session. Optional ones (dashed tag) are extra warm-ups and cool-downs: do them if you have the time.</li>
				</ul>
			</details>

			<section id="race" className={`${card} mt-4 scroll-mt-16`}>
				<h2 className={guideTitle}>Using it for your April race</h2>
				<ul className={guideList}>
					{HYROX_RACE_NOTES.map((n) => <li key={n}>{n}</li>)}
				</ul>
				<p className={`${guideText} text-muted`}>Personal training reference, transcribed from the Hyrox Mastery Elite plan (Endurance app).</p>
			</section>
		</section>
	);
}
