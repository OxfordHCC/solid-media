import {useLocation} from 'wouter-preact';
import {Session} from '@inrupt/solid-client-authn-browser';

export const session = new Session();

export function useAuthentication(): Session;
export function useAuthentication(redirect: true): Session;
export function useAuthentication(redirect: boolean = true): Session | null {
	if (session.info.isLoggedIn) return session;
	else {
		let [location, setLocation] = useLocation();
		if (redirect) setLocation(`/login?redirect=${location}`);
		return null;
	}
}
