import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { serviceClient, slugify } from '@/lib/cms';

const TYPES: Record<string, string> = {
	'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
};
const MAX_BYTES = 8 * 1024 * 1024;

/** Uploads a picture to the public `cms-media` bucket and returns its URL (multipart: `file`, `site_id`). */
export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

	const form = await request.formData().catch(() => null);
	const file = form?.get('file');
	const siteId = String(form?.get('site_id') ?? '');
	if (!(file instanceof File) || !siteId) return NextResponse.json({ ok: false, error: 'Choose an image.' }, { status: 400 });
	if (!TYPES[file.type]) return NextResponse.json({ ok: false, error: 'Use a JPG, PNG, WebP, GIF or AVIF image.' }, { status: 400 });
	if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: 'Image is over 8 MB.' }, { status: 400 });

	// The site must belong to the signed-in owner (RLS applies to this read).
	const { data: site } = await session.supabase.from('cms_sites').select('id').eq('id', siteId).maybeSingle();
	if (!site) return NextResponse.json({ ok: false, error: 'Site not found.' }, { status: 404 });

	const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'image';
	const path = `${siteId}/${Date.now()}-${base}.${TYPES[file.type]}`;
	const db = serviceClient();
	const { error } = await db.storage.from('cms-media').upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
	if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

	const { data } = db.storage.from('cms-media').getPublicUrl(path);
	return NextResponse.json({ ok: true, url: data.publicUrl });
}
