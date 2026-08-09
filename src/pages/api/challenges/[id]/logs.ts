import type { APIRoute } from 'astro';
import { requireUser, type ProofType } from '../../../../lib/challenges';

const ALLOWED: ProofType[] = ['text', 'link', 'image'];

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const { id: challengeId } = params;
	const form = await request.formData();

	const note = String(form.get('note') ?? '').trim();
	const proofType = String(form.get('proof_type') ?? 'text') as ProofType;

	if (!note) {
		return redirect(`/challenges/${challengeId}?error=A note is required.`);
	}
	if (!ALLOWED.includes(proofType)) {
		return redirect(`/challenges/${challengeId}?error=Invalid proof type.`);
	}

	let proofUrl: string | null = null;

	if (proofType === 'link') {
		proofUrl = String(form.get('proof_link') ?? '').trim() || null;
	} else if (proofType === 'image') {
		const file = form.get('proof_file');
		if (file instanceof File && file.size > 0) {
			const path = `${user.id}/${challengeId}/${Date.now()}-${file.name}`;
			const { error: uploadError } = await supabase.storage
				.from('challenge-proofs')
				.upload(path, file, { contentType: file.type });

			if (uploadError) {
				return redirect(`/challenges/${challengeId}?error=${encodeURIComponent(uploadError.message)}`);
			}

			const { data: signed } = await supabase.storage
				.from('challenge-proofs')
				.createSignedUrl(path, 60 * 60 * 24 * 365);

			proofUrl = signed?.signedUrl ?? null;
		}
	}

	const { error } = await supabase.from('challenge_logs').insert({
		challenge_id: challengeId,
		user_id: user.id,
		note,
		proof_type: proofType,
		proof_url: proofUrl,
		status: 'pending',
	});

	if (error) {
		return redirect(`/challenges/${challengeId}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(`/challenges/${challengeId}`);
};
