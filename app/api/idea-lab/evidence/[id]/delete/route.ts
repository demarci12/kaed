import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { id } = await params;

	const { data: row } = await session.supabase
		.from('idea_lab_evidence')
		.select('idea_candidate_id')
		.eq('id', id)
		.maybeSingle();

	const { error } = await session.supabase.from('idea_lab_evidence').delete().eq('id', id);

	const back = row?.idea_candidate_id ? `/idea-lab/${row.idea_candidate_id}` : '/idea-lab';
	if (error) {
		return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent(error.message)}`, request.url), {
			status: 303,
		});
	}
	return NextResponse.redirect(new URL(back, request.url), { status: 303 });
}
