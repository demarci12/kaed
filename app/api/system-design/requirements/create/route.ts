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
	const kind = String(form.get('kind') ?? 'functional');
	const priority = String(form.get('priority') ?? 'must');
	const useCaseId = String(form.get('use_case_id') ?? '').trim();

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!projectId) {
		return back('/system-design?error=Missing project.');
	}
	if (!title) {
		return back(`/system-design/${projectId}?error=Title is required.`);
	}

	const { error } = await supabase.from('system_requirements').insert({
		project_id: projectId,
		user_id: user.id,
		use_case_id: useCaseId || null,
		title,
		description: description || null,
		kind,
		priority,
	});

	if (error) {
		return back(`/system-design/${projectId}?error=${encodeURIComponent(error.message)}`);
	}

	return back(`/system-design/${projectId}`);
}
