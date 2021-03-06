export function randInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min)) + min;
}

export function shuffle(list: any[]) {
	const max = list.length;
	for (let i = 0; i < max; i++) {
		const j = randInt(i, max);
		[list[i], list[j]] = [list[j], list[i]];
	}
}
