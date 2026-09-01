import type { SupabaseClient } from '@supabase/supabase-js';
import type { IdeaLabWorksheet } from './idea-lab';

const WORKSHEET_COLUMNS = '*';

/**
 * Fetches the user's one and only Idea Lab worksheet, creating it on first
 * visit. There is no "start a worksheet" action anywhere in the UI on purpose
 * -- the lab is a permanent workspace you walk into, not a document you have
 * to file first. The insert races harmlessly: idea_lab.user_id is unique, so a
 * double-submit loses the insert and re-reads the winner instead of creating
 * a second worksheet.
 */
export async function getOrCreateWorksheet(
	supabase: SupabaseClient,
	userId: string,
): Promise<IdeaLabWorksheet | null> {
	const { data: existing } = await supabase
		.from('idea_lab')
		.select(WORKSHEET_COLUMNS)
		.eq('user_id', userId)
		.maybeSingle();
	if (existing) return existing as IdeaLabWorksheet;

	const { data: created } = await supabase
		.from('idea_lab')
		.insert({ user_id: userId })
		.select(WORKSHEET_COLUMNS)
		.single();
	if (created) return created as IdeaLabWorksheet;

	// Lost the race against a concurrent insert -- the unique constraint did
	// its job, so the winner's row is there to read.
	const { data: raced } = await supabase
		.from('idea_lab')
		.select(WORKSHEET_COLUMNS)
		.eq('user_id', userId)
		.maybeSingle();
	return (raced as IdeaLabWorksheet | null) ?? null;
}
