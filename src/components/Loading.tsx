import { Component, VNode } from 'preact';
import {Props} from './types';

export default class Loading extends Component<{render?: () => Promise<VNode>}, {contents: VNode | null}> {
	state: {contents: VNode | null} = {
		contents: null,
	};
	
	public componentWillReceiveProps(nextProps: any) {
		this.setState({contents: null});
	}
	
	public render({render}: Props<{render?: () => Promise<VNode>}>): VNode {
		if (this.state.contents !== null) {
			return this.state.contents;
		} else if (render !== undefined) {
			render()
				.then(contents => this.setState({contents}));
		}
		
		return (
			<div>
				Loading...
			</div>
		);
	}
}
