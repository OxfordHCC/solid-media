import { h, Component, Fragment, VNode } from 'preact';
import { Redirect } from 'wouter-preact';
import { Props } from './types';
import { session } from './authentication';
import Loading from './Loading';
import Form from './Form';

import { HOMEPAGE } from '../env';

const providers = [
	{title: "Inrupt Pod Spaces", url: 'https://broker.pod.inrupt.com/'},
	{title: "inrupt.net", url: 'https://inrupt.net/'},
	{title: "solidcommunity.net", url: 'https://solidcommunity.net/'},
	{title: "Solid Web", url: 'https://solidweb.org/'},
	{title: "Trinpod", url: 'https://trinpod.us/'},
];

export default class Login extends Component<{redirect: string | null}> {
	state = {
		handleRedirect: true,
		provider: '',
	};
	
	public render({redirect}: Props<{redirect: string | null}>): VNode {

		// check whether haivng logged in, using 'authentication'
		
		if (session.info.isLoggedIn) {
			return <Redirect to={redirect ?? `${HOMEPAGE}/`} />;
		} else if (this.state.handleRedirect) {
			session
				.handleIncomingRedirect({ restorePreviousSession : true })
				.then(() => { this.setState({handleRedirect: false}); });
			
			return <Loading />;
		} else {
			return (
				<div class="login-page">
					<header class="showcase">
						<div class="logo">
							<img src={'./assets/logo.png'}></img>
						</div>
						<div class="showcase-content">
							<div class="formm">
								<Form submit={({provider}) => session.login({
									oidcIssuer: provider,
									clientName: "Solid Media",
									redirectUrl: window.location.href,
								})}>
									<h3>Sign In</h3>
									<h3>Select or enter your pod provider</h3>
									<div class="pod-input-container">
										<div class="info">
											<input
												class="provider"
												name='provider'
												type='text'
												placeholder='Pod Provider'
												value={this.state.provider}
												onInput={({target}) => this.setState({provider: (target as HTMLInputElement).value})}
											/>
										</div>
										<div class="btn1">
												<input 
													class="btn-secondary" 
													type='submit'  
													value="Login"
												/>
										</div>
									</div>
									
									{providers.map(({url, title}) => <>
										<div class="btn">
											<input 
												class="btn-primary" 
												type='submit' 
												onClick={() => this.setState({provider: url})} 
												value={title} 
											/>
										</div>
										<br />
									</>)}
								</Form>
							</div>
						</div>
					</header>
				</div>
			);
		}
	}
}
