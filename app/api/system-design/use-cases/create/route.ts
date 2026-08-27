import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const projectId = String(form.get('project_id') ?? '');
	const title = String(form.get('title') ?? '').trim();
	const description = String(form.get('description') ?? '').trim();
	const preconditions = String(form.get('preconditions') ?? '').trim();
	const mainFlow = String(form.get('main_flow') ?? '').trim();
	const postconditions = String(form.get('postconditions') ?? '').trim();
	const actorId = String(form.get('actor_id') ?? '').trim();

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!projectId) {
		return back('/system-design?error=Missing project.');
	}
	if (!title) {
		return back(`/system-design/${projectId}?error=Title is required.`);
	}

	const { error } = await supabase.from('system_use_cases').insert({
		project_id: projectId,
		user_id: user.id,
		actor_id: actorId || null,
		title,
		description: description || null,
		preconditions: preconditions || null,
		main_flow: mainFlow || null,
		postconditions: postconditions || null,
	});

	if (error) {
		return back(`/system-design/${projectId}?error=${encodeURIComponent(error.message)}`);
	}

	return back(`/system-design/${projectId}`);
}
