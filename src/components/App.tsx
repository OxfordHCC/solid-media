import { VNode } from 'preact';
import { useState } from 'preact/hooks';
import {Router, Switch, Route, useLocation} from 'wouter-preact';
import {Props} from './types';
import Login from './Login';
import HomeScreen from './HomeScreen';
import ViewScreen from './ViewScreen';
import {getSearchParam} from './lib';
import { SessionProvider } from '../contexts/SessionContext';

import {HOMEPAGE} from '../env';

export default function App(): VNode {
	const [location, setLocation] = useLocation();
	const [state, setState] = useState({});

	const spaUrl = getSearchParam("spaurl");
	if (spaUrl !== null) setLocation(spaUrl);

	return (
		<SessionProvider>
			<Router>
				<Switch>
					<Route<{args: string}> path={`${HOMEPAGE}/login`} component={() => <Login redirect={getSearchParam("redirect")} />} />
					<Route<{args: string}> path={`${HOMEPAGE}/view`} component={() => <ViewScreen url={getSearchParam("url")} />} />
					<Route<{args: string}> path={`${HOMEPAGE}/`} component={() => <HomeScreen globalState={{state, setState}} />} />
				</Switch>
			</Router>
		</SessionProvider>
	);
}
