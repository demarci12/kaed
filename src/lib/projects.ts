export { requireOwner as requireUser } from './auth';

export type ProjectStatus = 'not_started' | 'active' | 'done';
export type ProofType = 'text' | 'link' | 'image';
export type ProofStatus = 'pending' | 'verified' | 'rejected';
export type SignalType = 'progress' | 'customer_contact' | 'interest_expressed' | 'paid' | 'rejected';

export const HEADLINE_SIGNAL_TYPES: SignalType[] = ['customer_contact', 'interest_expressed', 'paid'];

export interface Project {
	id: string;
	user_id: string;
	title: string;
	description: string | null;
	status: ProjectStatus;
	start_date: string | null;
	target_end_date: string | null;
	business_idea_id: string | null;
	created_at: string;
	updated_at: string;
}

export interface ProjectLog {
	id: string;
	project_id: string;
	user_id: string;
	note: string;
	proof_type: ProofType;
	proof_url: string | null;
	status: ProofStatus;
	signal_type: SignalType;
	created_at: string;
}
