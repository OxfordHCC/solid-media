import { VNode } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Redirect } from 'wouter-preact';
import { useSession } from '../contexts/SessionContext';
import Loading from '../components/ui/Loading';

import { BASE_URL } from '../env';

export default function LoginCallback({redirect}: {redirect: string | null}): VNode {
    const [isLoading, setIsLoading] = useState(true);
	const { session, isLoggedIn, handleIncomingRedirect } = useSession();

	useEffect(() => {
        setIsLoading(true);
        const fn = async () => {
		    const success = await handleIncomingRedirect();
            if (success) {
                setIsLoading(false);
            } else {
                setIsLoading(false);
            }
        }

        fn().catch((error) => {
            console.error('Error handling incoming redirect:', error);
            setIsLoading(false);
        });
	}, [handleIncomingRedirect]);

	// Show loading while processing the callback
	if (isLoading) {
		return <Loading />;
	}

	// If login was successful, redirect to the intended page
	if (isLoggedIn) {
		return <Redirect to={redirect ?? `${BASE_URL}`} />;
	}

	// If login failed or no login detected, redirect back to login page
	return <Redirect to={`${BASE_URL}login`} />;
}
