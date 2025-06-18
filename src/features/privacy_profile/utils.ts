import { SolidDataset, getSolidDataset, getStringNoLocale, getThing, getUrl } from '@inrupt/solid-client';
import { Namespace } from 'rdflib';
import { PrivacyProfile, enumFromString } from './enums';

const NS_CHAIMEDIA = Namespace('urn:podtok:core#');

export async function getPrivacyProfileFromWebIdProfile(webIdProfile: string | null, authFetch: typeof fetch): Promise<PrivacyProfile | null> {
    if (!webIdProfile) return null;
    // Use solid-client to get the webid profile dataset
    const profileDataset = await getSolidDataset(webIdProfile, { fetch: authFetch });
    if (!profileDataset) return null;
    const profileThing = getThing(profileDataset, webIdProfile);
    if (!profileThing) return null;
    // Get the user info URL from the profile dataset
    const userInfoUrl = getUrl(profileThing, NS_CHAIMEDIA('userInfo').value);
    if (!userInfoUrl) return null;
    // Get the user settings dataset using the user info URL
    const userSettingsDataset = await getSolidDataset(userInfoUrl, { fetch: authFetch });
    if (!userSettingsDataset) return null;
    // Get the privacy profile from the user settings dataset
    const userSettingThing = getThing(userSettingsDataset, userInfoUrl);
    if (!userSettingThing) return null;
    const privacyProfileValue = getStringNoLocale(userSettingThing, NS_CHAIMEDIA('privacyProfile').value);
    if (!privacyProfileValue) return null;

    return privacyProfileValue as PrivacyProfile;
}