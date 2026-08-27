import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import type { ProjectStatus } from '@/lib/projects';

const ALLOWED: ProjectStatus[] = ['not_started', 'active', 'done'];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase } = session;

	const { id } = await params;
	const form = await request.formData();
	const status = String(form.get('status') ?? '') as ProjectStatus;

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!ALLOWED.includes(status)) {
		return back(`/projects/${id}?error=Invalid status.`);
	}

	const { error } = await supabase
		.from('projects')
		.update({ status, updated_at: new Date().toISOString() })
		.eq('id', id);

	if (error) {
		return back(`/projects/${id}?error=${encodeURIComponent(error.message)}`);
	}

	return back(`/projects/${id}`);
}
