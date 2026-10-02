import type { Metadata } from 'next';
import { LEGAL_CONTACT, LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Terms of service — KAED' };

export default function TermsPage() {
	return (
		<LegalPage title="Terms of service.">
			<div>
				<h2>What this is</h2>
				<p>
					KAED (kaed.hu) is a private, personal tool operated by Marton Deak. It is not a commercial service and
					there is no public sign-up. Access is by invitation only.
				</p>
			</div>

			<div>
				<h2>Use of the service</h2>
				<p>
					The app is provided as is, without any warranty. Figures it shows, including bank data and currency
					conversions, are informational and may be incomplete or delayed; they are not financial advice and
					should not be relied on for accounting or tax purposes.
				</p>
			</div>

			<div>
				<h2>Bank connections</h2>
				<p>
					The app can read, never change, account information from a bank the owner chooses to connect through
					Enable Banking. It cannot initiate payments. Access lasts only as long as the bank's consent period
					and can be withdrawn at any time, from the app or at the bank.
				</p>
			</div>

			<div>
				<h2>Changes and contact</h2>
				<p>
					These terms may change; the date above shows the latest version. Questions go to{' '}
					<a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>.
				</p>
			</div>
		</LegalPage>
	);
}
