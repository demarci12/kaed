import type { Metadata } from 'next';
import { HYROX_KEY, HYROX_RACE_NOTES, HYROX_WEEKS, withPaces } from '@/lib/hyrox';
import { card, cardLabel, chip, chipMuted, guideList, guideText, guideTitle, PageHead } from '@/components/ui';

// Public (no login) but kept out of search engines: the content is a
// transcription of a paid plan, shared by link only.
export const metadata: Metadata = {
	title: 'Hyrox 12-week plan · KAED',
	robots: { index: false, follow: false },
};

/**
 * The 12-week Hyrox plan, every week and every block on one page. Static data
 * from lib/hyrox.ts, no database. Running pace tags show the real pace next to
 * them (worked out from the 5k pace in lib/hyrox.ts). Public: no auth check.
 */
export default function HyroxPage() {

	return (
		<section className="max-w-[1080px]">
			<PageHead
				eyebrow="Personal"
				title="Hyrox 12-week plan"
				lede="5 sessions a week, Days 1–60. Week 7 is a deload, Week 12 is race week. Blocks the recordings never showed are marked (not shown)."
			/>

			<nav aria-label="Weeks" className="sticky top-0 z-10 mt-8 -mx-1 px-1 py-2.5 flex gap-1.5 flex-wrap max-md:flex-nowrap max-md:overflow-x-auto max-md:[&>a]:shrink-0 max-md:[&>a]:whitespace-nowrap bg-canvas/95 backdrop-blur">
				{HYROX_WEEKS.map((w) => (
					<a key={w.week} href={`#week-${w.week}`} className={w.label ? chipMuted : chip}>
						W{w.week}{w.label ? ` · ${w.label.split(' / ')[0]}` : ''}
					</a>
				))}
				<a href="#race" className={chipMuted}>Race notes</a>
			</nav>

			<div className={`${card} mt-6`}>
				<h2 className={guideTitle}>Key</h2>
				<ul className={guideList}>
					{HYROX_KEY.map((k) => <li key={k}>{k}</li>)}
				</ul>
			</div>

			{HYROX_WEEKS.map((w) => (
				<section key={w.week} id={`week-${w.week}`} className="mt-12 scroll-mt-16">
					<h2 className="m-0 font-serif text-[26px] font-semibold tracking-[-0.01em]">
						Week {w.week}
						{w.label && <span className="ml-2.5 align-middle text-sm font-sans font-medium text-muted">{w.label}</span>}
					</h2>
					<div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
						{w.days.map((d) => (
							<article key={d.day} id={`day-${d.day}`} className={card}>
								<div className="flex items-baseline justify-between gap-3 flex-wrap">
									<span className={cardLabel}>Day {d.day}</span>
									{d.duration && <span className="text-xs text-muted tabular-nums">{d.duration}</span>}
								</div>
								<h3 className="m-0 font-serif text-[19px] font-semibold leading-tight">{d.title}</h3>
								<ul className={guideList}>
									{d.blocks.map((b, i) => <li key={i}>{withPaces(b)}</li>)}
								</ul>
							</article>
						))}
					</div>
				</section>
			))}

			<section id="race" className={`${card} mt-12 scroll-mt-16`}>
				<h2 className={guideTitle}>Using it for your April race</h2>
				<ul className={guideList}>
					{HYROX_RACE_NOTES.map((n) => <li key={n}>{n}</li>)}
				</ul>
				<p className={`${guideText} text-muted`}>Personal training reference, transcribed from the Hyrox Mastery Elite plan (Endurance app).</p>
			</section>
		</section>
	);
}
