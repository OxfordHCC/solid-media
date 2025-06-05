import { Fragment, VNode } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Redirect } from 'wouter-preact';
import { Props } from './types';
import { useSession } from '../contexts/SessionContext';
import Loading from './Loading';
import Form from './Form';
import logo from '../assets/logo.png';

import { HOMEPAGE } from '../env';

const providers = [
	// {title: "Inrupt Pod Spaces", url: 'https://start.inrupt.com/'},
	{title: "inrupt.net", url: 'https://inrupt.net/'},
	{title: "solidcommunity.net", url: 'https://solidcommunity.net/'},
	{title: "Solid Web", url: 'https://solidweb.org/'},
	// {title: "Trinpod", url: 'https://trinpod.us/'},
	// {title: "use.id", url: 'https://get.use.id/'},
	{title: "solidweb.me", url: 'https://solidweb.me/'}
];

export default function Login({redirect}: {redirect: string | null}): VNode {
	const { session, isLoggedIn, isLoading } = useSession();
	const [provider, setProvider] = useState('');

	// check whether user has logged in, using 'authentication'
	if (isLoggedIn) {
		return <Redirect to={redirect ?? `${HOMEPAGE}/`} />;
	} else if (isLoading) {
		return <Loading />;
	} else {
		return (
			<div class="login-page">
				<header class="showcase">
					<div class="logo">
						<img src={logo} alt="Logo"></img>
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
											id="provider"
											name='provider'
											type='text'
											placeholder='Pod Provider'
											value={provider}
											onInput={({target}) => setProvider((target as HTMLInputElement).value)}
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
											onClick={() => setProvider(url)}
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
