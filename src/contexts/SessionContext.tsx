import { createContext } from 'preact';
import { useContext, useState } from 'preact/hooks';
import { Session } from '@inrupt/solid-client-authn-browser';
import { useLocation } from 'wouter-preact';
import { ComponentChildren } from 'preact';

import { BASE_URL } from '../env';

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
			window.location.href = `${BASE_URL}login`; // Not a good implementation. Maybe replace with useLocation?
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

export function useSessionContext(): SessionContextType;
export function useSessionContext(requireAuth: true): SessionContextType | null;
export function useSessionContext(requireAuth: boolean): SessionContextType | null;
export function useSessionContext(requireAuth: boolean = false): SessionContextType | null {
	const context = useContext(SessionContext) as SessionContextType;
	if (context === undefined) {
		throw new Error('useSession must be used within a SessionProvider');
	}

	const [location, setLocation] = useLocation();

	if (requireAuth && !context.isLoggedIn) {
		setLocation(`${BASE_URL}login?redirect=${encodeURIComponent(location)}`);
		return null;
	}

	return context;
}
