
export type OpenPointStatus = 'open' | 'in_progress' | 'closed';

export const OPEN_POINT_STATUS_LABELS: Record<OpenPointStatus, string> = {
	open: 'Open',
	in_progress: 'In progress',
	closed: 'Closed',
};

export const OPEN_POINT_STATUSES = Object.keys(OPEN_POINT_STATUS_LABELS) as OpenPointStatus[];

/**
 * An item on the Open Point List. Linked to at most one parent -- a goal or a
 * project, never both (enforced by the open_points_single_parent CHECK).
 */
export interface OpenPoint {
	id: string;
	user_id: string;
	title: string;
	body: string | null;
	status: OpenPointStatus;
	contributors: string | null;
	goal_id: string | null;
	project_id: string | null;
	created_at: string;
}

export interface OpenPointNote {
	id: string;
	open_point_id: string;
	user_id: string;
	note: string;
	created_at: string;
}

export interface OpenPointStatusEvent {
	id: string;
	open_point_id: string;
	user_id: string;
	status: OpenPointStatus;
	changed_at: string;
}

/** One phase in the timeline: a status and how long it lasted (or has, if still current). */
export interface StatusPhase {
	status: OpenPointStatus;
	from: string;
	to: string | null;
	durationMs: number;
}

/** Turns the raw status_events rows into phases with durations -- the actual "how long was this stuck" answer. */
export function buildStatusTimeline(events: OpenPointStatusEvent[]): StatusPhase[] {
	const sorted = [...events].sort((a, b) => a.changed_at.localeCompare(b.changed_at));
	const now = Date.now();
	return sorted.map((event, i) => {
		const next = sorted[i + 1];
		const from = new Date(event.changed_at).getTime();
		const to = next ? new Date(next.changed_at).getTime() : now;
		return { status: event.status, from: event.changed_at, to: next?.changed_at ?? null, durationMs: to - from };
	});
}

/** "3d 4h", "2h 15m", "just now" -- coarse enough to read at a glance, not a stopwatch. */
export function formatDuration(ms: number): string {
	const minutes = Math.floor(ms / 60000);
	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ${minutes % 60}m`;
	const days = Math.floor(hours / 24);
	return `${days}d ${hours % 24}h`;
}
