import { useState, useEffect, useMemo } from 'preact/hooks';
import { PrivacyProfile, UIElement, PrivacyProfileUIElements } from './privacyProfileDefinitions';
import { getPrivacyProfileFromWebIdProfile, savePrivacyProfileToWebIdProfile } from './utils';

interface UsePrivacyProfileOptions {
  webID: string;
  authFetch: typeof fetch;
}

interface UsePrivacyProfileReturn {
  privacyProfile: PrivacyProfile | null;
  enabledUIElements: UIElement[];
  isLoading: boolean;
  error: string | null;
  updatePrivacyProfile: (newProfile: PrivacyProfile) => Promise<void>;
  retry: () => void;
}

/**
 * Custom hook for managing privacy profile state and operations
 *
 * @param options - Configuration object containing webID and authFetch
 * @returns Privacy profile state and operations
 */
export function usePrivacyProfile({ webID, authFetch }: UsePrivacyProfileOptions): UsePrivacyProfileReturn {
  const [privacyProfile, setPrivacyProfile] = useState<PrivacyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate enabled UI elements based on current privacy profile
  const enabledUIElements = useMemo<UIElement[]>(() =>
    privacyProfile ? PrivacyProfileUIElements[privacyProfile] : PrivacyProfileUIElements.null,
    [privacyProfile]
  );

  // Load privacy profile from webID
  const loadPrivacyProfile = async () => {
    if (!webID) return;

    setIsLoading(true);
    setError(null);

    try {
      const profile = await getPrivacyProfileFromWebIdProfile(webID, authFetch);
      setPrivacyProfile(profile);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading privacy profile';
      console.error('Error loading privacy profile:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Update privacy profile
  const updatePrivacyProfile = async (newProfile: PrivacyProfile): Promise<void> => {
    setError(null);

    try {
      await savePrivacyProfileToWebIdProfile(webID, newProfile, authFetch);
      setPrivacyProfile(newProfile);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save privacy profile';
      console.error('Failed to save privacy profile:', err);
      setError(errorMessage);
      throw err; // Re-throw to allow calling component to handle
    }
  };

  // Retry loading privacy profile
  const retry = () => {
    loadPrivacyProfile();
  };

  // Load privacy profile when webID or authFetch changes
  useEffect(() => {
    loadPrivacyProfile();
  }, [webID, authFetch]);

  return {
    privacyProfile,
    enabledUIElements,
    isLoading,
    error,
    updatePrivacyProfile,
    retry,
  };
}
