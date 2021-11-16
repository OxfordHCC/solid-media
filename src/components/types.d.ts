export type CList<C> = undefined | C | C[];
export type Props<P = {}, C = undefined> = P & {children: C};
