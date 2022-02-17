import {h, Component, VNode} from 'preact';
import {Router, Switch, Route, useLocation} from 'wouter-preact';
import {Props} from './types';
import Login from './Login';
import HomeScreen from './HomeScreen';
import ViewScreen from './ViewScreen';
import {getSearchParam} from './lib';

import {HOMEPAGE} from '../env';

export default class App extends Component {
	state = {};
	
	public render({}: Props): VNode {
		const [location, setLocation] = useLocation();
		const spaUrl = getSearchParam("spaurl");
		if (spaUrl !== null) setLocation(spaUrl);
		
		return (
			<Router>
				<Switch>
					<Route<{args: string}> path={`${HOMEPAGE}/login`} component={() => <Login redirect={getSearchParam("redirect")} />} />
					<Route<{args: string}> path={`${HOMEPAGE}/view`} component={() => <ViewScreen url={getSearchParam("url")} />} />
					<Route<{args: string}> path={`${HOMEPAGE}/`} component={() => <HomeScreen globalState={this} />} />
				</Switch>
			</Router>
		);
	}
}
