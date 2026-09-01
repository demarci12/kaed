import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { IDEA_LAB_STEPS } from '@/lib/idea-lab';
import { getOrCreateWorksheet } from '@/lib/idea-lab-worksheet';

/**
 * Moves the guided walkthrough to a step and remembers it. Position lives on
 * the worksheet rather than in the URL so closing the tab and coming back
 * tomorrow resumes the process instead of restarting it -- the whole point of
 * guiding someone through eleven steps they won't finish in one sitting.
 */
export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const back = (query = '') => NextResponse.redirect(new URL(`/idea-lab${query}`, request.url), { status: 303 });

	const form = await request.formData();
	const step = Number(String(form.get('step') ?? ''));
	if (!Number.isInteger(step) || step < 1 || step > IDEA_LAB_STEPS.length) {
		return back('?error=Unknown step.');
	}

	const worksheet = await getOrCreateWorksheet(supabase, user.id);
	if (!worksheet) return back('?error=Could not open your worksheet.');

	// Not touching updated_at: moving between steps is navigation, not work,
	// and letting it bump the timestamp would make an untouched worksheet look
	// freshly edited every time you paged through it.
	const { error } = await supabase.from('idea_lab').update({ current_step: step }).eq('id', worksheet.id);
	if (error) return back(`?error=${encodeURIComponent(error.message)}`);

	return back();
}
