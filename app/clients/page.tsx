import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import type { Client, ClientStage } from '@/lib/clients';
import { InlineEdit } from '@/components/InlineEdit';
import { FormError, PageHead, Pill, table, tableWrap, td, th } from '@/components/ui';
import { NewClientPopup } from './NewClientPopup';

const STAGE_LABELS: Record<ClientStage, string> = {
	lead: 'Lead',
	contacted: 'Contacted',
	negotiating: 'Negotiating',
	won: 'Won',
	lost: 'Lost',
};

const STAGE_OPTIONS = Object.entries(STAGE_LABELS) as [string, string][];

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
	const { supabase } = await requireOwner();
	const { error } = await searchParams;

	const { data: clients } = await supabase
		.from('clients')
		.select('*')
		.order('created_at', { ascending: false });

	const typedClients = (clients ?? []) as Client[];

	return (
		<section className="max-w-[1120px]">
			<PageHead
				eyebrow="Personal"
				title="Clients."
				lede="A lightweight pipeline for people you're talking to."
				actions={<NewClientPopup />}
			/>

			{error && <FormError>{error}</FormError>}

			<div className={`${tableWrap} mt-10`}>
				<table className={table}>
					<thead>
						<tr>
							<th className={th}>Name</th>
							<th className={th}>Company</th>
							<th className={th}>Email</th>
							<th className={th}>Phone</th>
							<th className={th}>Stage</th>
							<th className={th}>Next follow-up</th>
							<th className={th}>Added</th>
						</tr>
					</thead>
					<tbody>
						{typedClients.length ? (
							typedClients.map((client) => (
								<tr key={client.id} className="[&>td]:whitespace-nowrap">
									<td className={td}>
										<Link className="text-ink no-underline font-medium hover:underline" href={`/clients/${client.id}`}>
											{client.name}
										</Link>
									</td>
									<td className={td}>
										<InlineEdit value={client.company ?? ''} field="company" id={client.id} endpoint="/api/clients" className="text-muted" placeholder="—" />
									</td>
									<td className={td}>
										<InlineEdit value={client.email ?? ''} field="email" id={client.id} endpoint="/api/clients" className="text-muted" placeholder="—" />
									</td>
									<td className={td}>
										<InlineEdit value={client.phone ?? ''} field="phone" id={client.id} endpoint="/api/clients" className="text-muted" placeholder="—" />
									</td>
									<td className={td}>
										<InlineEdit
											value={client.stage}
											field="stage"
											id={client.id}
											endpoint="/api/clients"
											kind="select"
											options={STAGE_OPTIONS}
											className="cursor-pointer"
											display={<Pill value={client.stage}>{STAGE_LABELS[client.stage]}</Pill>}
										/>
									</td>
									<td className={td}>
										<InlineEdit
											value={client.next_follow_up ?? ''}
											field="next_follow_up"
											id={client.id}
											endpoint="/api/clients"
											kind="date"
											className="text-muted tabular-nums"
											placeholder="—"
										/>
									</td>
									<td className={`${td} text-muted tabular-nums`}>{new Date(client.created_at).toLocaleDateString()}</td>
								</tr>
							))
						) : (
							<tr>
								<td className={`${td} py-8 text-center text-muted whitespace-normal`} colSpan={7}>
									No clients yet. Add your first one.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
}
