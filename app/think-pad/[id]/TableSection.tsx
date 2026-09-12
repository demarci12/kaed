import type { ThinkPadTable, ThinkPadTableRow } from '@/lib/think-pad';
import { CardItem, CardList, RemoveButton } from '@/components/CardList';
import { btnGhost, deleteBtn } from '@/components/ui';
import { TableCell } from './TableCell';

export function TableSection({ pageId, table, rows }: {
	pageId: string;
	table: ThinkPadTable | null;
	rows: ThinkPadTableRow[];
}) {
	if (!table) {
		return (
			<section className="mt-10 pt-4 border-t border-line">
				<form action={`/api/think-pad/${pageId}/table`} method="post" className="flex gap-2 items-center">
					<input
						type="text" name="name" placeholder="Table name (e.g. Tasks)" required
						className="h-10 px-3.5 rounded-full border border-line bg-canvas text-sm text-ink outline-none focus:border-ink"
					/>
					<button type="submit" className={btnGhost}>+ Add a database to this page</button>
				</form>
			</section>
		);
	}

	const { columns } = table;

	return (
		<section className="mt-10 pt-4 border-t border-line">
			<div className="flex items-center justify-between gap-3">
				<h2 className="m-0 font-serif text-lg font-semibold">{table.name}</h2>
				<form action={`/api/think-pad/${pageId}/table/delete`} method="post" className="m-0">
					<button type="submit" className={btnGhost}>Remove table</button>
				</form>
			</div>

			<div className="mt-3 overflow-x-auto border border-line rounded-2xl bg-paper">
				<table className="w-full border-collapse text-sm">
					<thead>
						<tr>
							{columns.map((col) => (
								<th key={col.name} className="text-left px-3 py-2.5 border-b border-line whitespace-nowrap">
									<span className="font-semibold">{col.name}</span>
									<span className="ml-1.5 text-[10px] uppercase tracking-[0.05em] text-muted">{col.type}</span>
									<form
										action={`/api/think-pad/${pageId}/table/columns/${encodeURIComponent(col.name)}/delete`}
										method="post"
										className="inline"
									>
										<button type="submit" className="ml-1.5 text-muted hover:text-negative" title="Remove column">×</button>
									</form>
								</th>
							))}
							<th className="border-b border-line" />
						</tr>
					</thead>
					<CardList as="tbody">
						{rows.length ? (
							rows.map((row) => (
								<CardItem key={row.id} id={row.id} as="tr">
									{columns.map((col) => (
										<td key={col.name} className="px-3 py-2 border-b border-line align-middle">
											<TableCell rowId={row.id} column={col} value={row.data[col.name] ?? ''} />
										</td>
									))}
									<td className="px-2 py-2 border-b border-line text-right whitespace-nowrap">
										<RemoveButton
											id={row.id}
											endpoint={`/api/think-pad/table-rows/${row.id}/delete`}
											className={deleteBtn}
											ariaLabel="Delete row"
										>×</RemoveButton>
									</td>
								</CardItem>
							))
						) : (
							<tr><td colSpan={columns.length + 1} className="px-3 py-4 text-muted">No rows yet.</td></tr>
						)}
					</CardList>
				</table>
			</div>

			<div className="mt-3 flex items-center gap-4 flex-wrap">
				<form action={`/api/think-pad/${pageId}/table/rows`} method="post" className="m-0">
					<button type="submit" className={btnGhost}>+ Row</button>
				</form>
				<form action={`/api/think-pad/${pageId}/table/columns`} method="post" className="m-0 flex gap-1.5 items-center">
					<input
						type="text" name="name" placeholder="Column name" required
						className="h-9 px-2.5 rounded-full border border-line bg-canvas text-[13px] text-ink outline-none focus:border-ink"
					/>
					<select
						name="type"
						className="h-9 px-2.5 rounded-full border border-line bg-canvas text-[13px] text-ink outline-none focus:border-ink"
					>
						<option value="text">Text</option>
						<option value="number">Number</option>
						<option value="date">Date</option>
						<option value="select">Select</option>
					</select>
					<input
						type="text" name="options" placeholder="Options, comma-separated (for Select)"
						className="h-9 px-2.5 rounded-full border border-line bg-canvas text-[13px] text-ink outline-none focus:border-ink w-56"
					/>
					<button type="submit" className={btnGhost}>+ Column</button>
				</form>
			</div>
		</section>
	);
}
