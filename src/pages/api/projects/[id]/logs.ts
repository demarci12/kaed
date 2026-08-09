import type { APIRoute } from 'astro';
import { requireUser, type ProofType, type SignalType } from '../../../../lib/projects';

const ALLOWED: ProofType[] = ['text', 'link', 'image'];
const ALLOWED_SIGNALS: SignalType[] = ['progress', 'customer_contact', 'interest_expressed', 'paid', 'rejected'];

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const { id: projectId } = params;
	const form = await request.formData();

	const note = String(form.get('note') ?? '').trim();
	const proofType = String(form.get('proof_type') ?? 'text') as ProofType;
	const signalType = String(form.get('signal_type') ?? 'progress') as SignalType;

	if (!note) {
		return redirect(`/projects/${projectId}?error=A note is required.`);
	}
	if (!ALLOWED.includes(proofType)) {
		return redirect(`/projects/${projectId}?error=Invalid proof type.`);
	}
	if (!ALLOWED_SIGNALS.includes(signalType)) {
		return redirect(`/projects/${projectId}?error=Invalid signal type.`);
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
				return redirect(`/projects/${projectId}?error=${encodeURIComponent(uploadError.message)}`);
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
		return redirect(`/projects/${projectId}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(`/projects/${projectId}`);
};
