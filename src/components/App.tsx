import {h, Component, VNode} from 'preact';
import {Router, Switch, Route} from 'wouter-preact';
import {Props} from './types';
import Login from './Login';
import HomeScreen from './HomeScreen';
import ViewScreen from './ViewScreen';
import {getSearchParam} from './lib';

export default class App extends Component {
	state = {};
	
	public render({}: Props): VNode {
		return (
			<Router>
				<Switch>
					<Route<{args: string}> path='/login' component={() => <Login redirect={getSearchParam("redirect")} />} />
					<Route<{args: string}> path='/view' component={() => <ViewScreen url={getSearchParam("url")} />} />
					<Route<{args: string}> path='/' component={() => <HomeScreen globalState={this} />} />
				</Switch>
			</Router>
		);
	}
}
