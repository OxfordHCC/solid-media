import { Component, VNode } from 'preact';
import {Props} from './types';

export default class Form extends Component<{submit: (value: any) => void}> {
	public render({submit, children}: Props<{submit: (value: any) => void}, VNode>): VNode {
		return (
			<form onSubmit={e => {
				e.preventDefault();
				submit(Object.fromEntries(new FormData(e.target as HTMLFormElement).entries()));
			}}>
				{children}
			</form>
		);
	}
}
