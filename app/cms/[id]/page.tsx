import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { POST_STATUS_LABELS, WEEKDAYS, type CmsIdea, type CmsPost, type CmsSite } from '@/lib/cms';
import { InlineEdit } from '@/components/InlineEdit';
import { CardItem, CardList, RemoveButton } from '@/components/CardList';
import {
	btn, btnGhost, cardLabel, cx, deleteBtn, Empty, FormError, PageHead, Pill, table, tableWrap, td, textarea, th,
} from '@/components/ui';
import { ApiKeyPanel, DeleteSiteButton, RebuildButton, RequeueButton, RunNowButton, ScheduleDays } from '../SiteControls';

const HOURS: [string, string][] = Array.from({ length: 24 }, (_, h) => [String(h), `${String(h).padStart(2, '0')}:00`]);
const YES_NO = (yes: string, no: string): [string, string][] => [['true', yes], ['false', no]];

const section = 'mt-14 scroll-mt-6';
const h2 = 'm-0 mb-1 font-serif text-2xl font-semibold tracking-[-0.01em]';
const hint = 'mt-1 mb-5 text-sm text-muted leading-relaxed max-w-[68ch]';
const row = 'grid gap-1.5 md:grid-cols-[200px_1fr] md:gap-6 py-4 border-b border-line items-start';

export default async function CmsSitePage({
	params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const [{ id }, { error }] = await Promise.all([params, searchParams]);

	const [{ data: site }, { data: posts }, { data: ideas }] = await Promise.all([
		supabase.from('cms_sites').select('*').eq('id', id).maybeSingle(),
		supabase.from('cms_posts').select('id, title, slug, status, publish_at, published_at, source, created_at').eq('site_id', id).order('created_at', { ascending: false }),
		supabase.from('cms_ideas').select('*').eq('site_id', id).neq('status', 'used').order('created_at', { ascending: true }),
	]);
	if (!site) notFound();
	const s = site as CmsSite;
	const typedPosts = (posts ?? []) as Pick<CmsPost, 'id' | 'title' | 'slug' | 'status' | 'publish_at' | 'published_at' | 'source' | 'created_at'>[];
	const typedIdeas = (ideas ?? []) as CmsIdea[];

	const when = (iso: string | null) =>
		iso ? new Date(iso).toLocaleString('hu-HU', { dateStyle: 'medium', timeStyle: 'short', timeZone: s.timezone }) : '—';

	return (
		<section className="max-w-[980px]">
			<PageHead
				eyebrow="Blog CMS"
				title={s.name}
				lede={s.domain ?? undefined}
				actions={
					<>
						<Link href="/cms" className={btnGhost}>← All sites</Link>
						<RebuildButton siteId={s.id} disabled={!s.deploy_hook_url} />
					</>
				}
			/>
			{error && <FormError>{error}</FormError>}

			<div className="mt-8"><RunNowButton siteId={s.id} /></div>

			{/* ── Ideas ─────────────────────────────────────────── */}
			<div id="ideas" className={section}>
				<h2 className={h2}>Ideas</h2>
				<p className={hint}>
					Feed the queue. Each idea becomes one article — a topic, a question your customers ask, target keywords, or a rough brief.
					The oldest idea is written first.
				</p>
				<form method="post" action="/api/cms/ideas/create" className="m-0 flex flex-col gap-2.5 items-start">
					<input type="hidden" name="site_id" value={s.id} />
					<textarea name="ideas" rows={4} required className={textarea}
						placeholder={'One idea per line, e.g.\nMennyibe kerül a kazáncsere Budapesten 2026-ban\nMiért kattog a radiátor, és mit lehet tenni'} />
					<button type="submit" className={btn}>+ Add to queue</button>
				</form>

				<CardList as="div" className="mt-6 flex flex-col gap-2.5">
					{typedIdeas.length ? typedIdeas.map((i) => (
						<CardItem key={i.id} id={i.id} as="div" className="flex items-start gap-3 p-3.5 border border-line rounded-[12px] bg-paper">
							<div className="flex-1 min-w-0">
								<InlineEdit value={i.idea} field="idea" id={i.id} endpoint="/api/cms/ideas" kind="textarea" className="block text-sm leading-relaxed" />
								{i.error && <p className="mt-1.5 mb-0 text-xs text-negative break-words">{i.error}</p>}
							</div>
							<Pill value={i.status === 'queued' ? 'pending' : i.status === 'generating' ? 'in_progress' : 'failed'}>
								{i.status === 'queued' ? 'Queued' : i.status === 'generating' ? 'Writing' : 'Failed'}
							</Pill>
							{i.status === 'failed' && <RequeueButton ideaId={i.id} />}
							<RemoveButton id={i.id} endpoint={`/api/cms/ideas/${i.id}/delete`} className={`${deleteBtn} shrink-0`} ariaLabel="Delete idea">×</RemoveButton>
						</CardItem>
					)) : <Empty>The queue is empty — add an idea above.</Empty>}
				</CardList>
			</div>

			{/* ── Posts ─────────────────────────────────────────── */}
			<div id="posts" className={section}>
				<div className="flex items-end justify-between gap-4 flex-wrap">
					<div>
						<h2 className={h2}>Posts</h2>
						<p className="m-0 text-sm text-muted">Times shown in {s.timezone}.</p>
					</div>
					<form method="post" action="/api/cms/posts/create" className="m-0 flex gap-2">
						<input type="hidden" name="site_id" value={s.id} />
						<input name="title" placeholder="New post title…" className="h-10 px-3.5 rounded-full border border-line bg-canvas text-sm outline-none focus:border-ink w-56" />
						<button type="submit" className={btnGhost}>+ Write manually</button>
					</form>
				</div>

				<div className={cx(tableWrap, 'mt-5')}>
					<table className={table}>
						<thead><tr>
							<th className={th}>Title</th><th className={th}>Status</th><th className={th}>Goes live</th><th className={th}></th>
						</tr></thead>
						<tbody>
							{typedPosts.length ? typedPosts.map((p) => (
								<tr key={p.id}>
									<td className={td}>
										<Link href={`/cms/${s.id}/posts/${p.id}`} className="text-ink font-medium no-underline hover:underline">{p.title}</Link>
										{p.source === 'ai' && <span className="ml-2 text-[11px] text-muted">AI</span>}
									</td>
									<td className={td}><Pill value={p.status === 'published' ? 'done' : p.status === 'scheduled' ? 'in_progress' : 'not_started'}>{POST_STATUS_LABELS[p.status]}</Pill></td>
									<td className={cx(td, 'tabular-nums whitespace-nowrap text-muted')}>{when(p.status === 'published' ? p.published_at : p.publish_at)}</td>
									<td className={cx(td, 'text-right')}><Link href={`/cms/${s.id}/posts/${p.id}`} className={cx(btnGhost, '!min-h-8 !px-3 text-[13px]')}>Open</Link></td>
								</tr>
							)) : <tr><td className={td} colSpan={4}><span className="text-muted">No posts yet.</span></td></tr>}
						</tbody>
					</table>
				</div>
			</div>

			{/* ── Settings ──────────────────────────────────────── */}
			<div id="settings" className={section}>
				<h2 className={h2}>Posting machine</h2>
				<p className={hint}>
					Once a day the machine publishes what is due and, if fewer than the buffer are waiting, writes the next article from the queue.
					Vercel&rsquo;s free plan runs it once daily; call <code className="font-mono text-[13px]">/api/cms/cron</code> from any scheduler with the cron secret to run it more often.
				</p>
				<div className="border-t border-line">
					<div className={row}><span className={cardLabel}>Running</span>
						<InlineEdit value={String(s.active)} field="active" id={s.id} endpoint="/api/cms/sites" kind="select" options={YES_NO('Active', 'Paused')} display={s.active ? 'Active' : 'Paused'} className="inline-block" /></div>
					<div className={row}><span className={cardLabel}>Mode</span>
						<div>
							<InlineEdit value={String(s.auto_publish)} field="auto_publish" id={s.id} endpoint="/api/cms/sites" kind="select"
								options={YES_NO('Auto-publish on schedule', 'Review first (drafts)')} display={s.auto_publish ? 'Auto-publish on schedule' : 'Review first (drafts)'} className="inline-block" />
							<p className="mt-1 mb-0 text-xs text-muted">Auto-publish schedules each new article for the next posting slot. Review mode leaves it as a draft for you to publish.</p>
						</div>
					</div>
					<div className={row}><span className={cardLabel}>Posting days</span><ScheduleDays siteId={s.id} days={s.schedule_days} order={WEEKDAYS} /></div>
					<div className={row}><span className={cardLabel}>Posting time</span>
						<InlineEdit value={String(s.publish_hour)} field="publish_hour" id={s.id} endpoint="/api/cms/sites" kind="select" options={HOURS} display={`${String(s.publish_hour).padStart(2, '0')}:00 (${s.timezone})`} className="inline-block" /></div>
					<div className={row}><span className={cardLabel}>Keep ready</span>
						<div>
							<InlineEdit value={String(s.buffer)} field="buffer" id={s.id} endpoint="/api/cms/sites" kind="number" display={`${s.buffer} post${s.buffer === 1 ? '' : 's'}`} className="inline-block" />
							<p className="mt-1 mb-0 text-xs text-muted">The machine writes a new article whenever fewer than this many are waiting to go out.</p>
						</div>
					</div>
				</div>

				<h2 className={cx(h2, 'mt-12')}>Site</h2>
				<div className="border-t border-line mt-4">
					<div className={row}><span className={cardLabel}>Name</span><InlineEdit value={s.name} field="name" id={s.id} endpoint="/api/cms/sites" className="inline-block" /></div>
					<div className={row}><span className={cardLabel}>Domain</span><InlineEdit value={s.domain ?? ''} field="domain" id={s.id} endpoint="/api/cms/sites" className="inline-block" /></div>
					<div className={row}><span className={cardLabel}>Language</span><InlineEdit value={s.language} field="language" id={s.id} endpoint="/api/cms/sites" className="inline-block" /></div>
					<div className={row}><span className={cardLabel}>Timezone</span><InlineEdit value={s.timezone} field="timezone" id={s.id} endpoint="/api/cms/sites" className="inline-block" /></div>
					<div className={row}>
						<span className={cardLabel}>Brand brief</span>
						<div>
							<InlineEdit value={s.brand_context ?? ''} field="brand_context" id={s.id} endpoint="/api/cms/sites" kind="textarea" className="block text-sm leading-relaxed whitespace-pre-wrap" placeholder="Click to describe the business…" />
							<p className="mt-1 mb-0 text-xs text-muted">What the business does, who it serves, services, city/region, tone of voice, and anything the writer must never claim. The better this is, the better every article.</p>
						</div>
					</div>
					<div className={row}>
						<span className={cardLabel}>Deploy hook</span>
						<div>
							<InlineEdit value={s.deploy_hook_url ?? ''} field="deploy_hook_url" id={s.id} endpoint="/api/cms/sites" className="inline-block break-all" placeholder="Paste the site's Vercel deploy hook URL…" />
							<p className="mt-1 mb-0 text-xs text-muted">Vercel → the site&rsquo;s project → Settings → Git → Deploy Hooks. Called whenever a post goes live or comes down.</p>
						</div>
					</div>
				</div>

				<h2 className={cx(h2, 'mt-12')}>API access</h2>
				<p className={hint}>
					The site reads its published posts at build time:
					<code className="block mt-2 font-mono text-[13px] bg-canvas border border-line rounded-[10px] px-3.5 py-2.5 break-all">
						GET /api/cms/v1/posts   Authorization: Bearer &lt;key&gt;
					</code>
				</p>
				<ApiKeyPanel siteId={s.id} prefix={s.api_key_prefix} />

				<div className="mt-14"><DeleteSiteButton siteId={s.id} /></div>
			</div>
		</section>
	);
}
