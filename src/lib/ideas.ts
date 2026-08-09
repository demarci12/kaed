export interface Idea {
	id: string;
	user_id: string;
	title: string;
	body: string | null;
	position_x: number;
	position_y: number;
	business_idea_id: string | null;
	created_at: string;
}

export interface IdeaConnection {
	id: string;
	user_id: string;
	from_idea_id: string;
	to_idea_id: string;
	created_at: string;
}
