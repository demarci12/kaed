'use client';

import { btn, btnGhost, cx } from '@/components/ui';

/** datetime-local yields wall-clock time with no zone; convert to an ISO instant in the browser's zone before posting. */
function toLocalInput(iso: string | null) {
	if (!iso) return '';
	const d = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleForm({ postId, publishAt }: { postId: string; publishAt: string | null }) {
	return (
		<form
			method="post"
			action={`/api/cms/posts/${postId}/status`}
			className="m-0 flex items-center gap-2 flex-wrap"
			onSubmit={(e) => {
				const form = e.currentTarget;
				const local = (form.elements.namedItem('local') as HTMLInputElement).value;
				(form.elements.namedItem('publish_at') as HTMLInputElement).value = local ? new Date(local).toISOString() : '';
			}}
		>
			<input type="hidden" name="action" value="schedule" />
			<input type="hidden" name="publish_at" />
			<input name="local" type="datetime-local" defaultValue={toLocalInput(publishAt)} required
				className={cx('h-10 px-3 rounded-full border border-line bg-canvas text-sm outline-none focus:border-ink')} />
			<button type="submit" className={btn}>Schedule</button>
		</form>
	);
}

export function StatusButton({ postId, action, children, confirmText }: {
	postId: string; action: 'publish' | 'draft'; children: React.ReactNode; confirmText?: string;
}) {
	return (
		<form method="post" action={`/api/cms/posts/${postId}/status`} className="m-0"
			onSubmit={(e) => { if (confirmText && !confirm(confirmText)) e.preventDefault(); }}>
			<input type="hidden" name="action" value={action} />
			<button type="submit" className={action === 'publish' ? btn : btnGhost}>{children}</button>
		</form>
	);
}
