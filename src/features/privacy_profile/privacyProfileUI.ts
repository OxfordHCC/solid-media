import { PrivacyProfile, UIElement } from './enums';

export const PrivacyProfileUIElements = {
    null: [
        UIElement.FRIEND_MOVIE,
        UIElement.RECOMMENDATION,
    ],
    [PrivacyProfile.LOCAL]: [],
    [PrivacyProfile.ACCURACY]: [UIElement.RECOMMENDATION],
    [PrivacyProfile.FUNCTION]: [
        UIElement.FRIEND_MOVIE,
        UIElement.RECOMMENDATION,
    ],
    [PrivacyProfile.FULL]: [
        UIElement.FRIEND_MOVIE,
        UIElement.FRIEND_LIKED,
        UIElement.RECOMMENDATION,
    ],
}
