import { VNode } from 'preact';
import {Props, CList} from './types';

export default function Form({submit, children}: Props<{submit: (value: any) => void}, CList<VNode>>): VNode {
	return (
		<form onSubmit={e => {
			e.preventDefault();
			submit(Object.fromEntries(new FormData(e.target as HTMLFormElement).entries()));
		}}>
			{children}
		</form>
	);
}
