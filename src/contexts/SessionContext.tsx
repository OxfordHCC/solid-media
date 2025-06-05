import { createContext } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import { Session } from '@inrupt/solid-client-authn-browser';
import { useLocation } from 'wouter-preact';
import { ComponentChildren } from 'preact';

import { HOMEPAGE } from '../env';

interface SessionContextType {
	session: Session;
	isLoggedIn: boolean;
	logout: () => Promise<void>;
	handleIncomingRedirect: () => Promise<boolean>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined) as any;

const globalSession = new Session();

export function SessionProvider({ children }: { children: ComponentChildren }) {
	const [isLoggedIn, setIsLoggedIn] = useState(false);

	const handleIncomingRedirect = async () => {
		const sessionInfo = await globalSession.handleIncomingRedirect({ restorePreviousSession: true });
		setIsLoggedIn(sessionInfo?.isLoggedIn || false);
		return sessionInfo?.isLoggedIn || false;
	};

	const handleLogout = async () => {
		try {
			await globalSession.logout();
			setIsLoggedIn(false);
			window.location.href = `${HOMEPAGE}/login`; // Not a good implementation. Maybe replace with useLocation?
		} catch (error) {
			console.error('Logout failed:', error);
		}
	};

	const contextValue: SessionContextType = {
		session: globalSession,
		isLoggedIn,
		logout: handleLogout,
		handleIncomingRedirect,
	};

	return (
		<SessionContext.Provider value={contextValue}>
			{children}
		</SessionContext.Provider>
	);
}

export function useSession(): SessionContextType {
	const context = useContext(SessionContext) as SessionContextType;
	if (context === undefined) {
		throw new Error('useSession must be used within a SessionProvider');
	}
	return context;
}

export function useAuthenticatedSession(): Session;
export function useAuthenticatedSession(redirect: true): Session;
export function useAuthenticatedSession(redirect: boolean = true): Session | null {
	const { session, isLoggedIn } = useSession();
	const [location, setLocation] = useLocation();
	
	if (isLoggedIn) {
		return session;
	} else {
		if (redirect) {
			setLocation(`${HOMEPAGE}/login?redirect=${encodeURIComponent(location)}`);
		}
		return null;
	}
}
