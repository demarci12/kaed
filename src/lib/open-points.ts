export { requireOwner as requireUser } from './auth';

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
