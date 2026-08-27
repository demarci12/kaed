import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const projectId = String(form.get('project_id') ?? '');
	const name = String(form.get('name') ?? '').trim();
	const description = String(form.get('description') ?? '').trim();
	const kind = String(form.get('kind') ?? 'primary');

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!projectId) {
		return back('/system-design?error=Missing project.');
	}
	if (!name) {
		return back(`/system-design/${projectId}?error=Name is required.`);
	}

	const { error } = await supabase.from('system_actors').insert({
		project_id: projectId,
		user_id: user.id,
		name,
		description: description || null,
		kind,
	});

	if (error) {
		return back(`/system-design/${projectId}?error=${encodeURIComponent(error.message)}`);
	}

	return back(`/system-design/${projectId}`);
}
