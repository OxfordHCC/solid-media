import {useLocation} from 'wouter-preact';
import {Session} from '@inrupt/solid-client-authn-browser';

import {HOMEPAGE} from '../env';

export const session = new Session();

export function useAuthentication(): Session;
export function useAuthentication(redirect: true): Session;
export function useAuthentication(redirect: boolean = true): Session | null {
	if (session.info.isLoggedIn) return session;
	else {
		let [location, setLocation] = useLocation();
		if (redirect) setLocation(`${HOMEPAGE}/login?redirect=${location}`);
		return null;
	}
}
