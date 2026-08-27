import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function POST(request: Request) {
	const supabase = await createSupabaseServerClient();
	await supabase.auth.signOut();
	return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
