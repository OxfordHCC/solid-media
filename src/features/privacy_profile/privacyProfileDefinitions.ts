export enum PrivacyProfile {
    LOCAL = 'local',
    ACCURACY = 'accuracy',
    FUNCTION = 'function',
    FULL = 'full',
}

export enum UIElement {
    FRIEND_MOVIE = 'friendMovie',
    FRIEND_LIKED = 'friendLiked',
    RECOMMENDATION = 'recommendation',
    CHAITOK_HISTORY = 'chaitok',
}

export function enumFromString<T extends Record<string, string>>(
    enumObject: T,
    value: string
): T[keyof T] | null {
    if (enumIsValid(enumObject, value)) {
        return value;
    }
    return null;
}

export function enumIsValid<T extends Record<string, string>>(
    enumObject: T,
    value: string
): value is T[keyof T] {
    return Object.values(enumObject).includes(value as T[keyof T]);
}
export const PrivacyProfileUIElements = {
    null: [
        UIElement.FRIEND_MOVIE,
        UIElement.RECOMMENDATION,
        UIElement.CHAITOK_HISTORY,
    ],
    [PrivacyProfile.LOCAL]: [],
    [PrivacyProfile.ACCURACY]: [UIElement.RECOMMENDATION],
    [PrivacyProfile.FUNCTION]: [
        UIElement.FRIEND_MOVIE,
        UIElement.RECOMMENDATION,
        UIElement.CHAITOK_HISTORY,
    ],
    [PrivacyProfile.FULL]: [
        UIElement.FRIEND_MOVIE,
        UIElement.FRIEND_LIKED,
        UIElement.RECOMMENDATION,
        UIElement.CHAITOK_HISTORY,
    ],
};
