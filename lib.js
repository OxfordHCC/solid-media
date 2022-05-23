export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
export function shuffle(list) {
  const max = list.length;
  for (let i = 0; i < max; i++) {
    const j = randInt(i, max);
    [list[i], list[j]] = [list[j], list[i]];
  }
}
