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
 * - LOCAL (🔒) : Only local data, no sharing
 * - ACCURACY (🎯): Limited sharing for accuracy features
 * - FUNCTION (⚙️): Functional sharing including friend movies and recommendations
 * - FULL (🌐) : Full sharing including friend movies, likes, and recommendations
 */

interface PrivacyProfileIconProps {
  currentProfile: PrivacyProfile | null;
  onProfileChange: (profile: PrivacyProfile) => Promise<void>;
}

interface PrivacyProfileVisual {
  icon: string;
  label: string;
  color: string;
}

const VISUAL: Record<PrivacyProfile | 'null', PrivacyProfileVisual> = {
  'null': {
    icon: '❓',
    label: 'Not Set',
    color: '#CCCCCC', // Light gray
  },
  [PrivacyProfile.LOCAL]: {
    icon: '🔒',
    label: 'Local',
    color: '#C9FFE5', // Aero Blue
  },
  [PrivacyProfile.ACCURACY]: {
    icon: '🎯',
    label: 'Accuracy',
    color: '#40E0D0', // Turquoise
  },
  [PrivacyProfile.FUNCTION]: {
    icon: '⚙️',
    label: 'Function',
    color: '#ADD8E6', // Sky blue
  },
  [PrivacyProfile.FULL]: {
    icon: '🌐',
    label: 'Full',
    color: '#CCCCFF', // Periwinkle
  },
};

const PRIVACY_PROFILE_ORDERED = [
  PrivacyProfile.LOCAL,
  PrivacyProfile.FUNCTION,
  PrivacyProfile.ACCURACY,
  PrivacyProfile.FULL,
];

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

  const currentIcon = VISUAL[currentProfile ?? 'null'].icon;
  const currentLabel = VISUAL[currentProfile ?? 'null'].label;

  return (
    <div class="privacy-profile-icon" ref={dropdownRef}>
      <button
        class="privacy-profile-button profile-main-color"
        style={`background: ${VISUAL[currentProfile ?? 'null'].color}; opacity: 0.85;`}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={isChanging}
        title={`Privacy Profile: ${currentLabel}`}
      >
        {isChanging ? '⏳' : currentIcon}
      </button>

      {isDropdownOpen && (
        <div class="privacy-profile-dropdown">
          <div class="privacy-profile-heading">Privacy Profile</div>
          {Object.values(PRIVACY_PROFILE_ORDERED).map((profile) => (
            <button
              key={profile}
              class={`privacy-profile-option ${profile === currentProfile ? 'selected' : ''}`}
              onClick={() => handleProfileSelect(profile)}
              disabled={isChanging}
            >
              <span
                class="profile-color-bar"
                style={`background: ${VISUAL[profile].color}`}
              />
              <span
                class="profile-icon-bg"
                style={`background: ${VISUAL[profile].color}`}
              >
                <span class="profile-icon">{VISUAL[profile].icon}</span>
              </span>
              <span class="profile-label">{VISUAL[profile].label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
