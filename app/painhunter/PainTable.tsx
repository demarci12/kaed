import { CardList } from '@/components/CardList';
import { table, tableWrap, thCompact, thScore } from '@/components/ui';
import { SCORES, type PainPoint } from '@/lib/painhunter';
import type { LinkedIdea } from './IdeaLinks';
import { PainMobileCard } from './PainMobileCard';
import { PainRow } from './PainRow';

export type PainTableRow = {
	pain: PainPoint;
	linked: LinkedIdea[];
	linkOptions: { id: string; title: string }[];
	top: boolean;
};

/**
 * One line per pain on a wide screen, a compact card per pain below that.
 * Both views are in the page and CSS picks one, inside a single CardList so
 * archiving or deleting in either hides the pain in both.
 */
export function PainTable({ rows }: { rows: PainTableRow[] }) {
	return (
		<CardList className="mt-4">
			<div className={`${tableWrap} hidden lg:block`}>
				<table className={`${table} min-w-[940px]`}>
					<thead>
						<tr>
							<th className="w-8 border-b border-line" aria-label="Details" />
							<th className={thScore} title="Total of the five scores">Total</th>
							<th className={thCompact}>Pain</th>
							{SCORES.map(({ key, label, hint }) => (
								<th key={key} className={thScore} title={hint}>{label}</th>
							))}
							<th className={thCompact}>Ideas</th>
							<th className="border-b border-line" aria-label="Actions" />
						</tr>
					</thead>
					{rows.map((row) => <PainRow key={row.pain.id} {...row} />)}
				</table>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:hidden">
				{rows.map((row) => <PainMobileCard key={row.pain.id} {...row} />)}
			</div>
		</CardList>
	);
}
