export { requireUser } from './auth';

export interface Challenge {
	id: string;
	project_id: string;
	user_id: string;
	title: string;
	is_done: boolean;
	created_at: string;
}
