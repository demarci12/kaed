import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { isPainSource, todayInBudapest } from '@/lib/painhunter';

export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const text = (name: string) => String(form.get(name) ?? '').trim();
	const title = text('title');
	const source = text('source') || 'journal';
	const context = text('context');
	const noticedOn = text('noticed_on');

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });
	const fail = (message: string) => back(`/painhunter?error=${encodeURIComponent(message)}`);

	if (!title) return fail('Describe the pain first.');
	if (!isPainSource(source)) return fail('Invalid source.');
	if (context.length > 80) return fail('Context is too long (80 characters max).');
	if (noticedOn && !/^\d{4}-\d{2}-\d{2}$/.test(noticedOn)) return fail('Invalid date.');

	const { error } = await supabase.from('pain_points').insert({
		user_id: user.id,
		title,
		details: text('details') || null,
		who: text('who') || null,
		workaround: text('workaround') || null,
		source,
		context: context || null,
		noticed_on: noticedOn || todayInBudapest(),
	});

	if (error) return fail(error.message);
	return back('/painhunter');
}
