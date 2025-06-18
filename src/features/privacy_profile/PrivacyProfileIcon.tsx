import { VNode } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { PrivacyProfile } from './privacyProfileDefinitions';
import './PrivacyProfileIcon.css';

/**
 * Privacy Profile Icon Component
 *
 * Displays a small circular icon in the top-left corner that shows the current privacy profile
 * and allows users to change it by clicking to open a dropdown menu.
 *
 * Privacy Profiles:
 * - LOCAL (🔒): Only local data, no sharing
 * - ACCURACY (🎯): Limited sharing for accuracy features
 * - FUNCTION (⚙️): Functional sharing including friend movies and recommendations
 * - FULL (🌐): Full sharing including friend movies, likes, and recommendations
 */

interface PrivacyProfileIconProps {
  currentProfile: PrivacyProfile | null;
  onProfileChange: (profile: PrivacyProfile) => Promise<void>;
}

const privacyIcons: Record<PrivacyProfile | 'null', string> = {
  'null': '❓',
  [PrivacyProfile.LOCAL]: '🔒',
  [PrivacyProfile.ACCURACY]: '🎯',
  [PrivacyProfile.FUNCTION]: '⚙️',
  [PrivacyProfile.FULL]: '🌐',
};

const privacyLabels: Record<PrivacyProfile | 'null', string> = {
  'null': 'Not Set',
  [PrivacyProfile.LOCAL]: 'Local',
  [PrivacyProfile.ACCURACY]: 'Accuracy',
  [PrivacyProfile.FUNCTION]: 'Function',
  [PrivacyProfile.FULL]: 'Full',
};

export default function PrivacyProfileIcon({ currentProfile, onProfileChange }: PrivacyProfileIconProps): VNode {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleProfileSelect = async (profile: PrivacyProfile) => {
    if (profile === currentProfile) {
      setIsDropdownOpen(false);
      return;
    }

    setIsChanging(true);
    try {
      await onProfileChange(profile);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Failed to change privacy profile:', error);
    } finally {
      setIsChanging(false);
    }
  };

  const currentIcon = privacyIcons[currentProfile ?? 'null'];
  const currentLabel = privacyLabels[currentProfile ?? 'null'];

  return (
    <div class="privacy-profile-icon" ref={dropdownRef}>
      <button
        class="privacy-profile-button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={isChanging}
        title={`Privacy Profile: ${currentLabel}`}
      >
        {isChanging ? '⏳' : currentIcon}
      </button>

      {isDropdownOpen && (
        <div class="privacy-profile-dropdown">
          <div class="privacy-profile-heading">Privacy Profile</div>
          {Object.values(PrivacyProfile).map((profile) => (
            <button
              key={profile}
              class={`privacy-profile-option ${profile === currentProfile ? 'selected' : ''}`}
              onClick={() => handleProfileSelect(profile)}
              disabled={isChanging}
            >
              <span class="profile-icon">{privacyIcons[profile]}</span>
              <span class="profile-label">{privacyLabels[profile]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
