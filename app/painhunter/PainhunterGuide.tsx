import Link from 'next/link';
import {
	GUIDE_AVOID, GUIDE_FILTER, GUIDE_LEDE, GUIDE_METHODS, GUIDE_WEEKS,
} from '@/lib/painhunter-guide';
import type { PainSource } from '@/lib/painhunter';
import { card, cardHead, cardTitle, chip, chipMuted, guideList, guideText, guideTitle, scoreBadge } from '@/components/ui';

const grid = 'grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]';

/**
 * Open by default so the method is in front of you every time you log a pain;
 * collapse it with the header. A native <details> keeps this a Server
 * Component. Each method links to the pains found that way.
 */
export function PainhunterGuide({ counts }: { counts: Partial<Record<PainSource, number>> }) {
	return (
		<details open className="group mt-8">
			<summary className="flex items-center justify-between gap-3 px-5 py-3 rounded-2xl border border-line bg-paper cursor-pointer list-none [&::-webkit-details-marker]:hidden">
				<span>
					<span className="font-serif text-lg font-semibold">Where to look</span>
					<span className="ml-3 text-sm text-muted">{GUIDE_LEDE}</span>
				</span>
				<span aria-hidden="true" className="text-muted transition-transform group-open:rotate-90">▸</span>
			</summary>

			<div className="mt-4 flex flex-col gap-4">
				<div className={grid}>
					{GUIDE_METHODS.map((m) => {
						const count = counts[m.source] ?? 0;
						return (
							<section key={m.n} className={card}>
								<div className={cardHead}>
									<span className={scoreBadge}>{m.n}</span>
									<h3 className={`${cardTitle} m-0`}>{m.title}</h3>
								</div>
								<p className={guideText}>{m.lead}</p>
								{m.bullets && (
									<ul className={guideList}>{m.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
								)}
								{m.tail && <p className={guideText}>{m.tail}</p>}
								<div className="mt-auto pt-1">
									{count > 0 ? (
										<Link href={`/painhunter?source=${m.source}`} className={chip}>
											{count} logged this way
										</Link>
									) : (
										<span className={chipMuted}>None logged this way yet</span>
									)}
								</div>
							</section>
						);
					})}
				</div>

				<div className={grid}>
					<section className={card}>
						<h3 className={guideTitle}>{GUIDE_AVOID.title}</h3>
						<ul className={guideList}>{GUIDE_AVOID.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
					</section>

					<section className={card}>
						<h3 className={guideTitle}>{GUIDE_FILTER.title}</h3>
						<p className={guideText}>{GUIDE_FILTER.lead}</p>
						<ul className="m-0 p-0 list-none flex flex-col gap-1.5 text-sm leading-relaxed text-ink">
							{GUIDE_FILTER.criteria.map((c) => (
								<li key={c.term}><strong>{c.term}:</strong> {c.text}</li>
							))}
						</ul>
						<p className={guideText}>{GUIDE_FILTER.tail}</p>
					</section>

					<section className={card}>
						<h3 className={guideTitle}>{GUIDE_WEEKS.title}</h3>
						<ul className={guideList}>
							{GUIDE_WEEKS.steps.map((s) => (
								<li key={s.text}>
									{s.text}
									{s.children && (
										<ul className={`${guideList} mt-1.5 list-[circle]`}>
											{s.children.map((c) => <li key={c}>{c}</li>)}
										</ul>
									)}
								</li>
							))}
						</ul>
					</section>
				</div>
			</div>
		</details>
	);
}
