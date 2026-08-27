import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const description = String(form.get('description') ?? '').trim();
	const startDate = String(form.get('start_date') ?? '').trim();
	const targetEndDate = String(form.get('target_end_date') ?? '').trim();
	const businessIdeaId = String(form.get('business_idea_id') ?? '').trim();
	const returnTo = String(form.get('return_to') ?? '').trim();

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!title) {
		return back(`${returnTo || '/projects'}?error=Title is required.`);
	}

	const { data, error } = await supabase
		.from('projects')
		.insert({
			user_id: user.id,
			title,
			description: description || null,
			start_date: startDate || null,
			target_end_date: targetEndDate || null,
			business_idea_id: businessIdeaId || null,
		})
		.select('id')
		.single();

	if (error) {
		return back(`${returnTo || '/projects'}?error=${encodeURIComponent(error.message)}`);
	}

	return back(`/projects/${data.id}`);
}
