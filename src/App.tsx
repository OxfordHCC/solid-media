import { VNode } from 'preact';
import { Router, Switch, Route, useLocation } from 'wouter-preact';
import Login from './pages/Login';
import LoginCallback from './pages/LoginCallback';
import HomeScreen from './pages/HomeScreen';
import ViewScreen from './pages/ViewScreen';
import { getSearchParam } from './utils/routing';
import { SessionProvider } from './contexts/SessionContext';
import { QueryProvider } from './contexts/QueryProvider';

import { BASE_URL } from './env';

export default function App(): VNode {
	const [location, setLocation] = useLocation();

	const spaUrl = getSearchParam("spaurl");
	if (spaUrl !== null) setLocation(spaUrl);

	return (
		<QueryProvider>
			<SessionProvider>
				<Router>
					<Switch>
						<Route<{args: string}> path={`${BASE_URL}callback`} component={() => <LoginCallback redirect={getSearchParam("redirect")} />} />
						<Route<{args: string}> path={`${BASE_URL}login`} component={() => <Login redirect={getSearchParam("redirect")} />} />
						<Route<{args: string}> path={`${BASE_URL}view`} component={() => <ViewScreen url={getSearchParam("url")} />} />
						<Route<{args: string}> path={`${BASE_URL}`} component={() => <HomeScreen />} />
					</Switch>
				</Router>
			</SessionProvider>
		</QueryProvider>
	);
}
