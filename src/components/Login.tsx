import {h, Component, Fragment, VNode} from 'preact';
import {Redirect} from 'wouter-preact';
import {Props} from './types';
import {session} from './authentication';
import Loading from './Loading';
import Form from './Form';

import {HOMEPAGE} from '../env';

const providers = [
	{title: "Inrupt Pod Spaces", url: 'https://broker.pod.inrupt.com/'},
	{title: "inrupt.net", url: 'https://inrupt.net/'},
	{title: "solidcommunity.net", url: 'https://solidcommunity.net/'},
	{title: "Solid Web", url: 'https://solidweb.org/'},
];

export default class Login extends Component<{redirect: string | null}> {
	state = {
		handleRedirect: true,
		provider: 'https://',
	};
	
	public render({redirect}: Props<{redirect: string | null}>): VNode {
		if (session.info.isLoggedIn) {
			return <Redirect to={redirect ?? `${HOMEPAGE}/`} />;
		} else if (this.state.handleRedirect) {
			session
				.handleIncomingRedirect(window.location.href)
				.then(() => { this.setState({handleRedirect: false}); });
			
			return <Loading />;
		} else {
			return (
				<Form submit={({provider}) => session.login({
					oidcIssuer: provider,
					clientName: "Solid Media",
					redirectUrl: window.location.href,
				})}>
					<input
						name='provider'
						type='text'
						placeholder='Login Provider'
						value={this.state.provider}
						onInput={({target}) => this.setState({provider: (target as HTMLInputElement).value})}
					/>
					<input type='submit' value='Sign In!' />
					<br />
					{providers.map(({url, title}) => <>
						<input type='button' onClick={() => this.setState({provider: url})} value={title} />
						<br />
					</>)}
				</Form>
			);
		}
	}
}
