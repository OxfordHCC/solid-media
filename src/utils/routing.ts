export function getSearchParams(): URLSearchParams {
	return new URLSearchParams(document.location.search.substring(1));
}

export function getSearchParam(key: string): string | null {
	return getSearchParams().get(key);
}

export function noDefault(handler: (e: Event) => void): (e: Event) => void {
	return e => {
		e.stopPropagation();
		e.preventDefault();
		handler(e);
	};
}
