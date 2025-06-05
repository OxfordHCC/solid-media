import { VNode } from 'preact';
import { useEffect } from 'preact/hooks';
import { Redirect } from 'wouter-preact';
import { useSession } from '../contexts/SessionContext';
import Loading from './Loading';

import { HOMEPAGE } from '../env';

export default function LoginCallback({redirect}: {redirect: string | null}): VNode {
	const { session, isLoggedIn, isLoading } = useSession();

	useEffect(() => {
		// The session context will automatically handle the incoming redirect
		// when the component mounts, so we don't need to do anything here
	}, []);

	// Show loading while processing the callback
	if (isLoading) {
		return <Loading />;
	}

	// If login was successful, redirect to the intended page
	if (isLoggedIn) {
		return <Redirect to={redirect ?? `${HOMEPAGE}/`} />;
	}

	// If login failed or no login detected, redirect back to login page
	return <Redirect to={`${HOMEPAGE}/login`} />;
}
