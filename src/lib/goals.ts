export { requireOwner as requireUser } from './auth';

export interface Goal {
	id: string;
	user_id: string;
	title: string;
	description: string | null;
	rank: number;
	created_at: string;
	updated_at: string;
}
