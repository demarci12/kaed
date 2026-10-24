import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { allowedStatuses, NOTE_MAX, SCORE_AXES, stepByNumber, type Status } from '@/lib/playbook';

/**
 * Saves one step's answer: `{ idea_id, step, status?, note?, data? }`. Only the
 * fields sent are written, so a status click never clobbers a note. The run
 * (one per idea, plus the personal one with `idea_id: null`) is created on the
 * first write. Always JSON: the page calls this from the client, never a form.
 */
export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { supabase, user } = session;

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
	if (!body) return fail('Invalid request.');

	const step = typeof body.step === 'number' ? stepByNumber(body.step) : undefined;
	if (!step) return fail('Unknown step.');

	const ideaId = typeof body.idea_id === 'string' && body.idea_id ? body.idea_id : null;
	if (ideaId !== null && step.scope !== 'idea') return fail('That step belongs to the personal run.');
	if (ideaId === null && step.scope !== 'you') return fail('That step belongs to an idea.');

	const patch: { status?: Status; note?: string | null; data?: Record<string, number> | null } = {};

	if ('status' in body) {
		if (typeof body.status !== 'string' || !(allowedStatuses(step) as readonly string[]).includes(body.status)) return fail('Invalid status.');
		patch.status = body.status as Status;
	}
	if ('note' in body) {
		if (body.note !== null && typeof body.note !== 'string') return fail('Invalid note.');
		const note = (body.note ?? '').trim();
		if (note.length > NOTE_MAX) return fail(`A note is ${NOTE_MAX} characters at most.`);
		patch.note = note || null;
	}
	if ('data' in body) {
		if (step.kind !== 'scores') return fail('This step has no scores.');
		if (body.data === null) {
			patch.data = null;
		} else if (typeof body.data === 'object') {
			const scores: Record<string, number> = {};
			for (const { key } of SCORE_AXES) {
				const v = (body.data as Record<string, unknown>)[key];
				if (v === undefined || v === null) continue;
				if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 10) return fail('A score is 1 to 10.');
				scores[key] = v;
			}
			patch.data = Object.keys(scores).length ? scores : null;
		} else {
			return fail('Invalid scores.');
		}
	}
	if (!Object.keys(patch).length) return fail('Nothing to save.');

	if (ideaId) {
		const { data: idea } = await supabase.from('business_ideas').select('id').eq('id', ideaId).maybeSingle();
		if (!idea) return fail('Idea not found.', 404);
	}

	const findRun = async () => {
		let q = supabase.from('playbook_runs').select('id').eq('user_id', user.id);
		q = ideaId ? q.eq('idea_id', ideaId) : q.is('idea_id', null);
		const { data } = await q.maybeSingle();
		return data?.id as string | undefined;
	};

	let runId = await findRun();
	if (!runId) {
		const { data, error } = await supabase.from('playbook_runs').insert({ user_id: user.id, idea_id: ideaId }).select('id').single();
		// A second tab can win the race against the unique index; then the run exists.
		runId = data?.id ?? (await findRun());
		if (!runId) return fail(error?.message ?? 'Could not start the run.', 500);
	}

	const { error } = await supabase.from('playbook_answers').upsert(
		{ run_id: runId, user_id: user.id, step: step.n, ...patch, updated_at: new Date().toISOString() },
		{ onConflict: 'run_id,step' },
	);
	if (error) return fail(error.message, 500);

	return NextResponse.json({ ok: true });
}
