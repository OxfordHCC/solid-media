import { VNode, ComponentChildren } from 'preact';

export default function Form({submit, children}: {submit: (value: any) => void; children?: ComponentChildren}): VNode {
	return (
		<form onSubmit={e => {
			e.preventDefault();
			submit(Object.fromEntries(new FormData(e.target as HTMLFormElement).entries()));
		}}>
			{children}
		</form>
	);
}
