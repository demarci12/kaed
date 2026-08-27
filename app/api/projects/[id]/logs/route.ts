import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import type { ProofType, SignalType } from '@/lib/projects';

const ALLOWED: ProofType[] = ['text', 'link', 'image'];
const ALLOWED_SIGNALS: SignalType[] = ['progress', 'customer_contact', 'interest_expressed', 'paid', 'rejected'];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const { id: projectId } = await params;
	const form = await request.formData();

	const note = String(form.get('note') ?? '').trim();
	const proofType = String(form.get('proof_type') ?? 'text') as ProofType;
	const signalType = String(form.get('signal_type') ?? 'progress') as SignalType;

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!note) {
		return back(`/projects/${projectId}?error=A note is required.`);
	}
	if (!ALLOWED.includes(proofType)) {
		return back(`/projects/${projectId}?error=Invalid proof type.`);
	}
	if (!ALLOWED_SIGNALS.includes(signalType)) {
		return back(`/projects/${projectId}?error=Invalid signal type.`);
	}

	let proofUrl: string | null = null;

	if (proofType === 'link') {
		proofUrl = String(form.get('proof_link') ?? '').trim() || null;
	} else if (proofType === 'image') {
		const file = form.get('proof_file');
		if (file instanceof File && file.size > 0) {
			const path = `${user.id}/${projectId}/${Date.now()}-${file.name}`;
			const { error: uploadError } = await supabase.storage
				.from('challenge-proofs')
				.upload(path, file, { contentType: file.type });

			if (uploadError) {
				return back(`/projects/${projectId}?error=${encodeURIComponent(uploadError.message)}`);
			}

			const { data: signed } = await supabase.storage
				.from('challenge-proofs')
				.createSignedUrl(path, 60 * 60 * 24 * 365);

			proofUrl = signed?.signedUrl ?? null;
		}
	}

	const { error } = await supabase.from('project_logs').insert({
		project_id: projectId,
		user_id: user.id,
		note,
		proof_type: proofType,
		proof_url: proofUrl,
		status: 'pending',
		signal_type: signalType,
	});

	if (error) {
		return back(`/projects/${projectId}?error=${encodeURIComponent(error.message)}`);
	}

	return back(`/projects/${projectId}`);
}
