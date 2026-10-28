/**
 * Closed by default: how to have Claude log the day from a plain text file.
 * A native <details>, like the Painhunter guide, so it stays a Server Component.
 */
export function AutomationGuide() {
	return (
		<details className="group mt-8">
			<summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-5 py-3 [&::-webkit-details-marker]:hidden">
				<span>
					<span className="font-serif text-lg font-semibold">Automate with Claude</span>
					<span className="ml-3 text-sm text-muted">Log your day from a plain text file.</span>
				</span>
				<span aria-hidden="true" className="text-muted transition-transform group-open:rotate-90">▸</span>
			</summary>

			<div className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
				<section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-paper p-5">
					<h3 className="m-0 font-serif text-base font-semibold">The text file</h3>
					<p className="m-0 text-sm leading-relaxed text-muted">
						Anything readable works; Claude does the parsing. One line per ticket: the Jira key or the row number, the time, what happened, and
						optionally a status.
					</p>
					<pre className="m-0 overflow-x-auto rounded-xl border border-line bg-canvas p-3 text-xs leading-relaxed text-ink">{`2026-10-28
KB-123  1.5h  Reviewed the TARA with the team, waiting for the supplier's answer  [blocked]
KB-130  45m   Weekly sync
#12     2h    Wrote the test plan  [done]`}</pre>
				</section>

				<section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-paper p-5">
					<h3 className="m-0 font-serif text-base font-semibold">Tell Claude</h3>
					<p className="m-0 text-sm leading-relaxed text-muted">
						Connect the kead MCP server, then say it once, or make it a scheduled task for the end of each workday:
					</p>
					<pre className="m-0 whitespace-pre-wrap rounded-xl border border-line bg-canvas p-3 text-xs leading-relaxed text-ink">{`Read ~/work/today.txt and apply it to my Work tickets with work_daily_update: log the hours, add the text as a status comment, set the status in brackets. Then list what changed.`}</pre>
					<p className="m-0 text-xs leading-relaxed text-muted">
						Running it twice does not double anything: an identical comment or time entry for the same ticket and day is skipped.
					</p>
				</section>

				<section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-paper p-5">
					<h3 className="m-0 font-serif text-base font-semibold">What Claude can do</h3>
					<ul className="m-0 list-none p-0 text-sm leading-relaxed text-muted">
						<li><strong className="font-medium text-ink">work_list_tasks</strong>, <strong className="font-medium text-ink">work_get_task</strong>: read tickets, comments, hours</li>
						<li><strong className="font-medium text-ink">work_update_task</strong>: edit topic, description, status, owner, due date</li>
						<li><strong className="font-medium text-ink">work_add_comment</strong>, <strong className="font-medium text-ink">work_log_time</strong>: one ticket at a time</li>
						<li><strong className="font-medium text-ink">work_daily_update</strong>: a whole day in one call</li>
						<li><strong className="font-medium text-ink">work_create_task</strong>: new rows</li>
					</ul>
				</section>
			</div>
		</details>
	);
}
