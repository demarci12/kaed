export type ClientStage = 'lead' | 'contacted' | 'negotiating' | 'won' | 'lost';

export interface Client {
	id: string;
	user_id: string;
	name: string;
	company: string | null;
	email: string | null;
	phone: string | null;
	stage: ClientStage;
	next_follow_up: string | null;
	created_at: string;
	updated_at: string;
}

export interface ClientNote {
	id: string;
	client_id: string;
	user_id: string;
	note: string;
	created_at: string;
}
