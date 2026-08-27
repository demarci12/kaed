import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase } = session;

	const { id } = await params;
	const { data: useCase } = await supabase.from('system_use_cases').select('project_id').eq('id', id).maybeSingle();
	const { error } = await supabase.from('system_use_cases').delete().eq('id', id);

	const back = useCase?.project_id ? `/system-design/${useCase.project_id}` : '/system-design';
	if (error) {
		return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent(error.message)}`, request.url), {
			status: 303,
		});
	}

	return NextResponse.redirect(new URL(back, request.url), { status: 303 });
}
