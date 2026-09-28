'use client';

import { useRef, useState } from 'react';
import { btnGhost, cx } from '@/components/ui';
import { Markdown } from '@/components/Markdown';

export interface EditablePost {
	id: string;
	site_id: string;
	title: string;
	slug: string;
	description: string | null;
	excerpt: string | null;
	body_md: string;
	cover_image_url: string | null;
	cover_alt: string | null;
	keywords: string[];
}

type Field = 'title' | 'slug' | 'description' | 'excerpt' | 'body_md' | 'cover_image_url' | 'cover_alt' | 'keywords';

const box =
	'w-full font-sans text-[15px] leading-relaxed text-ink bg-canvas border border-line rounded-[10px] px-3.5 py-2.5 outline-none focus:border-ink';
const lab = 'block mb-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted';

/**
 * The post editor: plain inputs that save on blur through the field route (no
 * router.refresh(), so typing is never interrupted), a cover-picture uploader,
 * and a formatted preview of the Markdown body.
 */
export function PostEditor({ post }: { post: EditablePost }) {
	const [v, setV] = useState({
		title: post.title, slug: post.slug, description: post.description ?? '', excerpt: post.excerpt ?? '',
		body_md: post.body_md, cover_image_url: post.cover_image_url ?? '', cover_alt: post.cover_alt ?? '',
		keywords: post.keywords.join(', '),
	});
	const saved = useRef({ ...v });
	const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
	const [error, setError] = useState<string | null>(null);
	const [preview, setPreview] = useState(false);
	const [uploading, setUploading] = useState(false);

	const set = (f: Field) => (val: string) => setV((cur) => ({ ...cur, [f]: val }));

	async function save(field: Field, value: string) {
		if (value.trim() === saved.current[field].trim()) return;
		if ((field === 'title' || field === 'slug') && !value.trim()) {
			setV((cur) => ({ ...cur, [field]: saved.current[field] }));
			return;
		}
		setStatus('saving');
		setError(null);
		try {
			const res = await fetch(`/api/cms/posts/${post.id}/field`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ field, value }),
			});
			const payload = await res.json().catch(() => null);
			if (!res.ok) throw new Error(payload?.error || 'Could not save.');
			saved.current[field] = value;
			setStatus('saved');
		} catch (e) {
			setStatus('error');
			setError(e instanceof Error ? e.message : 'Could not save.');
		}
	}

	async function upload(file: File) {
		setUploading(true);
		setError(null);
		try {
			const form = new FormData();
			form.set('file', file);
			form.set('site_id', post.site_id);
			const res = await fetch('/api/cms/media', { method: 'POST', body: form });
			const payload = await res.json().catch(() => null);
			if (!res.ok || !payload?.ok) throw new Error(payload?.error || 'Upload failed.');
			set('cover_image_url')(payload.url);
			await save('cover_image_url', payload.url);
		} catch (e) {
			setStatus('error');
			setError(e instanceof Error ? e.message : 'Upload failed.');
		} finally {
			setUploading(false);
		}
	}

	const input = (f: Field, label: string, opts: { placeholder?: string; hint?: string } = {}) => (
		<div>
			<label className={lab} htmlFor={f}>{label}</label>
			<input id={f} value={v[f]} placeholder={opts.placeholder} onChange={(e) => set(f)(e.target.value)} onBlur={() => save(f, v[f])} className={box} />
			{opts.hint && <p className="mt-1 mb-0 text-xs text-muted">{opts.hint}</p>}
		</div>
	);

	const words = v.body_md.trim() ? v.body_md.trim().split(/\s+/).length : 0;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between gap-3 -mb-2">
				<span className="text-xs text-muted">Changes save when you leave a field.</span>
				<span aria-live="polite" className={cx('text-xs', status === 'error' ? 'text-negative' : 'text-muted')}>
					{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? 'Failed' : ''}
				</span>
			</div>

			{input('title', 'Title', { hint: `${v.title.length} characters — aim for 60 or fewer.` })}

			<div className="grid gap-6 md:grid-cols-2">
				{input('slug', 'URL slug', { hint: 'Lowercase, hyphenated. Changing it changes the post URL.' })}
				{input('keywords', 'Keywords', { placeholder: 'comma, separated', hint: 'Target keywords / tags.' })}
			</div>

			<div>
				<label className={lab} htmlFor="description">Meta description</label>
				<textarea id="description" rows={2} value={v.description} onChange={(e) => set('description')(e.target.value)} onBlur={() => save('description', v.description)} className={cx(box, 'resize-y')} />
				<p className={cx('mt-1 mb-0 text-xs', v.description.length > 160 ? 'text-negative' : 'text-muted')}>{v.description.length} / 160 characters</p>
			</div>

			<div>
				<label className={lab} htmlFor="excerpt">Excerpt</label>
				<textarea id="excerpt" rows={2} value={v.excerpt} onChange={(e) => set('excerpt')(e.target.value)} onBlur={() => save('excerpt', v.excerpt)} className={cx(box, 'resize-y')} />
				<p className="mt-1 mb-0 text-xs text-muted">Short teaser for the blog index.</p>
			</div>

			<div>
				<span className={lab}>Cover picture</span>
				<div className="flex gap-4 items-start flex-wrap">
					{v.cover_image_url ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={v.cover_image_url} alt={v.cover_alt} className="w-48 h-32 object-cover rounded-[10px] border border-line" />
					) : (
						<div className="w-48 h-32 rounded-[10px] border border-dashed border-line grid place-items-center text-xs text-muted">No picture</div>
					)}
					<div className="flex-1 min-w-[16rem] flex flex-col gap-3">
						<label className={cx(btnGhost, 'self-start cursor-pointer')}>
							{uploading ? 'Uploading…' : v.cover_image_url ? 'Replace picture' : 'Upload picture'}
							<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" disabled={uploading}
								onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
						</label>
						{input('cover_image_url', 'Or paste an image URL')}
						{input('cover_alt', 'Alt text', { hint: 'Describe the picture for accessibility and SEO.' })}
					</div>
				</div>
			</div>

			<div>
				<div className="flex items-center justify-between gap-3 mb-1.5">
					<label className={cx(lab, '!mb-0')} htmlFor="body_md">Article (Markdown) · {words} words</label>
					<button type="button" className={cx(btnGhost, '!min-h-8 !px-3 text-[13px]')} onClick={() => setPreview((p) => !p)}>
						{preview ? 'Edit' : 'Preview'}
					</button>
				</div>
				{preview ? (
					<div className="px-6 py-5 border border-line rounded-[14px] bg-paper"><Markdown>{v.body_md || '*Nothing written yet.*'}</Markdown></div>
				) : (
					<textarea id="body_md" rows={26} value={v.body_md} onChange={(e) => set('body_md')(e.target.value)} onBlur={() => save('body_md', v.body_md)}
						spellCheck className={cx(box, 'font-mono text-[13px] leading-[1.65] resize-y')} />
				)}
			</div>

			{error && <p className="m-0 text-sm text-negative">{error}</p>}
		</div>
	);
}
