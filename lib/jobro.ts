import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Read-only window into Jobro's own Supabase project (jobro.hu, a separate
 * database from kaed's). This is the only place kaed touches it.
 *
 * Read-only is enforced in code: callers get a `JobroReader`, which can page
 * through `select`s and list auth users and nothing else -- there is no insert,
 * update, delete or rpc to reach for. The credential underneath is the service
 * role key (it has to read `auth.users` and bypass RLS to see every tenant), so
 * the guarantee is this wrapper, not the key. Keep it that way: if Jobro ever
 * needs to be written to from here, add a named function for that one write
 * rather than exposing the client.
 *
 * Env (server-only, never NEXT_PUBLIC_): JOBRO_SUPABASE_URL,
 * JOBRO_SUPABASE_SERVICE_ROLE_KEY.
 */
export function jobroConfigured(): boolean {
	return Boolean(process.env.JOBRO_SUPABASE_URL && process.env.JOBRO_SUPABASE_SERVICE_ROLE_KEY);
}

/** A select query before it runs; filters (`gte`, `is`, `eq`...) chain onto it. */
export type JobroQuery = ReturnType<ReturnType<SupabaseClient['from']>['select']>;

export interface JobroAuthUser {
	id: string;
	email: string | null;
	created_at: string;
	last_sign_in_at: string | null;
}

export interface JobroReader {
	/**
	 * Every row of `table` matching `filter`, fetched page by page: PostgREST
	 * silently stops at 1000 rows per response, and a truncated usage count that
	 * looks right is worse than an error. Throws past `MAX_ROWS`.
	 */
	rows<T>(table: string, columns: string, filter?: (q: JobroQuery) => JobroQuery): Promise<T[]>;
	/** All Supabase auth users (email, created, last sign-in). */
	authUsers(): Promise<JobroAuthUser[]>;
}

const PAGE = 1000;
const MAX_ROWS = 50_000;

export function createJobroReader(): JobroReader {
	const url = process.env.JOBRO_SUPABASE_URL;
	const key = process.env.JOBRO_SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error('Jobro is not connected: set JOBRO_SUPABASE_URL and JOBRO_SUPABASE_SERVICE_ROLE_KEY.');
	const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

	return {
		async rows<T>(table: string, columns: string, filter?: (q: JobroQuery) => JobroQuery) {
			const out: T[] = [];
			for (let from = 0; from < MAX_ROWS; from += PAGE) {
				// `columns` is a runtime string, which supabase-js's select-string parser
				// can't type; '*' keeps it on the loose overload (rows are cast below).
				let q = client.from(table).select(columns as '*') as unknown as JobroQuery;
				if (filter) q = filter(q);
				// A stable order keeps pages from overlapping or skipping rows.
				const { data, error } = await q.order('created_at', { ascending: true }).range(from, from + PAGE - 1);
				if (error) throw new Error(`Jobro ${table}: ${error.message}`);
				const page = (data ?? []) as unknown as T[];
				out.push(...page);
				if (page.length < PAGE) return out;
			}
			throw new Error(`Jobro ${table}: more than ${MAX_ROWS} rows -- add an aggregate view on the Jobro side instead of paging everything.`);
		},

		async authUsers() {
			const out: JobroAuthUser[] = [];
			for (let page = 1; page <= 100; page++) {
				const { data, error } = await client.auth.admin.listUsers({ page, perPage: PAGE });
				if (error) throw new Error(`Jobro auth users: ${error.message}`);
				for (const u of data.users) {
					out.push({ id: u.id, email: u.email ?? null, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null });
				}
				if (data.users.length < PAGE) break;
			}
			return out;
		},
	};
}
