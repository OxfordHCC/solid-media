import { SolidDataset, getSolidDataset, getStringNoLocale, getThing, getUrl, setStringNoLocale, saveSolidDatasetAt, setThing } from '@inrupt/solid-client';
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

export async function savePrivacyProfileToWebIdProfile(webIdProfile: string, privacyProfile: PrivacyProfile, authFetch: typeof fetch): Promise<void> {
    // Use solid-client to get the webid profile dataset
    const profileDataset = await getSolidDataset(webIdProfile, { fetch: authFetch });
    if (!profileDataset) throw new Error('Could not load profile dataset');
    
    const profileThing = getThing(profileDataset, webIdProfile);
    if (!profileThing) throw new Error('Could not find profile thing');
    
    // Get the user info URL from the profile dataset
    const userInfoUrl = getUrl(profileThing, NS_CHAIMEDIA('userInfo').value);
    if (!userInfoUrl) throw new Error('Could not find user info URL');
    
    // Get the user settings dataset using the user info URL
    let userSettingsDataset = await getSolidDataset(userInfoUrl, { fetch: authFetch });
    if (!userSettingsDataset) throw new Error('Could not load user settings dataset');
    
    // Get the user setting thing from the user settings dataset
    let userSettingThing = getThing(userSettingsDataset, userInfoUrl);
    if (!userSettingThing) throw new Error('Could not find user setting thing');
    
    // Update the privacy profile value
    userSettingThing = setStringNoLocale(userSettingThing, NS_CHAIMEDIA('privacyProfile').value, privacyProfile);
    
    // Save the updated dataset
    userSettingsDataset = setThing(userSettingsDataset, userSettingThing);
    await saveSolidDatasetAt(userInfoUrl, userSettingsDataset, { fetch: authFetch });
}