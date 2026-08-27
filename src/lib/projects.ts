export { requireOwner as requireUser } from './auth';

export type ProjectStatus = 'not_started' | 'active' | 'done';
export type FundingStage = 'idea' | 'building' | 'bootstrapped' | 'funded' | 'profitable' | 'paused';

export const FUNDING_STAGE_LABELS: Record<FundingStage, string> = {
	idea: 'Idea',
	building: 'Building',
	bootstrapped: 'Bootstrapped',
	funded: 'Funded',
	profitable: 'Profitable',
	paused: 'Paused',
};
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
	tagline: string | null;
	website_url: string | null;
	location: string | null;
	team_size: number | null;
	industry: string | null;
	founded_year: number | null;
	funding_stage: FundingStage | null;
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

/**
 * Make a stored website value safe to use as an `href`.
 *
 * URLs are typed in bare ("jobro.hu"), and a bare value in an href is a
 * *relative* path -- the browser resolves it against the current origin and
 * sends you to kaed.hu/jobro.hu instead of the real site. Prepending https://
 * when no scheme is present is what makes the link actually leave the app.
 *
 * Only http(s) is allowed through: anything else (javascript:, data:) is
 * rejected outright rather than rendered as a clickable link.
 */
export function externalHref(url: string | null | undefined): string | null {
	const trimmed = (url ?? '').trim();
	if (!trimmed) return null;

	const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

	let parsed: URL;
	try {
		parsed = new URL(withScheme);
	} catch {
		return null;
	}
	return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
}

/** The bare host, for showing a link without the scheme clutter. */
export function displayHost(url: string | null | undefined): string | null {
	const href = externalHref(url);
	if (!href) return null;
	try {
		return new URL(href).host.replace(/^www\./, '');
	} catch {
		return null;
	}
}
