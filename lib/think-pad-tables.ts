import type { SupabaseClient } from '@supabase/supabase-js';
import type { ThinkPadColumn, ThinkPadColumnType, ThinkPadTable, ThinkPadTableRow } from './think-pad';
import { recomputeSearchText } from './think-pad-helpers';

export const COLUMN_TYPES: ThinkPadColumnType[] = ['text', 'number', 'date', 'select'];

export async function getTableForPage(supabase: SupabaseClient, pageId: string): Promise<ThinkPadTable | null> {
	const { data } = await supabase.from('think_pad_tables').select('*').eq('page_id', pageId).maybeSingle();
	if (!data) return null;
	return { ...data, columns: data.columns as ThinkPadColumn[] } as ThinkPadTable;
}

export async function listRows(supabase: SupabaseClient, tableId: string): Promise<ThinkPadTableRow[]> {
	const { data } = await supabase
		.from('think_pad_table_rows')
		.select('*')
		.eq('table_id', tableId)
		.order('position', { ascending: true });
	return ((data ?? []) as { id: string; table_id: string; position: number; data: Record<string, string> }[]).map(
		(row) => ({ ...row, data: row.data ?? {} }),
	);
}

export async function createTable(supabase: SupabaseClient, pageId: string, name: string): Promise<void> {
	await supabase.from('think_pad_tables').insert({ page_id: pageId, name: name.trim() || 'Table', columns: [] });
}

export async function deleteTable(supabase: SupabaseClient, pageId: string, tableId: string): Promise<void> {
	await supabase.from('think_pad_tables').delete().eq('id', tableId);
	await recomputeSearchText(supabase, pageId);
}

export async function addColumn(
	supabase: SupabaseClient,
	table: ThinkPadTable,
	{ name, type, options }: { name: string; type: string; options?: string },
): Promise<{ error?: string }> {
	const trimmedName = name.trim();
	if (!trimmedName) return { error: 'Column name is required.' };
	if (!COLUMN_TYPES.includes(type as ThinkPadColumnType)) return { error: 'Invalid column type.' };
	if (table.columns.some((c) => c.name === trimmedName)) return { error: 'A column with that name already exists.' };

	const column: ThinkPadColumn = { name: trimmedName, type: type as ThinkPadColumnType };
	if (type === 'select') {
		column.options = (options || '')
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}
	const columns = [...table.columns, column];
	await supabase.from('think_pad_tables').update({ columns }).eq('id', table.id);
	return {};
}

export async function removeColumn(supabase: SupabaseClient, table: ThinkPadTable, columnName: string): Promise<void> {
	// Leaves existing cell values in each row's JSON alone -- they're just
	// ignored once the column is gone, and re-adding a same-named column
	// later resurrects them, which is more often useful than surprising.
	const columns = table.columns.filter((c) => c.name !== columnName);
	await supabase.from('think_pad_tables').update({ columns }).eq('id', table.id);
}

export async function addRow(supabase: SupabaseClient, tableId: string): Promise<void> {
	const { data: last } = await supabase
		.from('think_pad_table_rows')
		.select('position')
		.eq('table_id', tableId)
		.order('position', { ascending: false })
		.limit(1)
		.maybeSingle();
	const position = ((last?.position as number | undefined) ?? -1) + 1;
	await supabase.from('think_pad_table_rows').insert({ table_id: tableId, position, data: {} });
}

export async function updateRowCell(
	supabase: SupabaseClient,
	pageId: string,
	rowId: string,
	columnName: string,
	value: string,
): Promise<{ error?: string }> {
	const { data: row } = await supabase.from('think_pad_table_rows').select('data').eq('id', rowId).maybeSingle();
	if (!row) return { error: 'Row not found.' };
	const data = { ...(row.data as Record<string, string>), [columnName]: value };
	await supabase.from('think_pad_table_rows').update({ data, updated_at: new Date().toISOString() }).eq('id', rowId);
	await recomputeSearchText(supabase, pageId);
	return {};
}

export async function deleteRow(supabase: SupabaseClient, pageId: string, rowId: string): Promise<void> {
	await supabase.from('think_pad_table_rows').delete().eq('id', rowId);
	await recomputeSearchText(supabase, pageId);
}
