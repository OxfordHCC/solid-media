import { SolidDataset, getSolidDataset, getStringNoLocale, getThing, getUrl, setStringNoLocale, saveSolidDatasetAt, setThing, setUrl, getResourceInfo, createSolidDataset, createThing } from '@inrupt/solid-client';
import { Namespace } from 'rdflib';
import { PrivacyProfile, enumFromString } from './privacyProfileDefinitions';

const NS_CHAIMEDIA = Namespace('urn:chaitok:core#');

const SETTER_CHAIFLIX = 'chaiflix';

export async function getPrivacyProfileFromWebIdProfile(webIdProfile: string | null, authFetch: typeof fetch): Promise<PrivacyProfile | null> {
    if (!webIdProfile) return null;
    // Use solid-client to get the webid profile dataset
    const profileDataset = await getSolidDataset(webIdProfile, { fetch: authFetch });
    if (!profileDataset) return null;
    const profileThing = getThing(profileDataset, webIdProfile);
    if (!profileThing) return null;
    // Get the user profile URL from the profile dataset
    const userProfileUrl = getUrl(profileThing, NS_CHAIMEDIA('userProfile').value);
    if (!userProfileUrl) return null;
    // Get the user settings dataset using the user profile URL
    const userSettingsDataset = await getSolidDataset(userProfileUrl, { fetch: authFetch });
    if (!userSettingsDataset) return null;
    // Get the privacy profile from the user settings dataset
    const userSettingThing = getThing(userSettingsDataset, userProfileUrl);
    if (!userSettingThing) return null;
    const privacyProfileValue = getStringNoLocale(userSettingThing, NS_CHAIMEDIA('privacyProfile').value);
    if (!privacyProfileValue) return null;

    const privacyProfileSetter = getStringNoLocale(userSettingThing, NS_CHAIMEDIA('privacyProfileSetter').value);
    if (!privacyProfileSetter || privacyProfileSetter !== SETTER_CHAIFLIX) {
        return PrivacyProfile.LOCAL;
    }

    return privacyProfileValue as PrivacyProfile;
}

export async function savePrivacyProfileToWebIdProfile(webIdProfile: string, privacyProfile: PrivacyProfile, authFetch: typeof fetch): Promise<void> {
    // Use solid-client to get the webid profile dataset
    const profileDataset = await getSolidDataset(webIdProfile, { fetch: authFetch });
    if (!profileDataset) throw new Error('Could not load profile dataset');

    const profileThing = getThing(profileDataset, webIdProfile);
    if (!profileThing) throw new Error('Could not find profile thing');

    // Get the user profile URL from the profile dataset
    let userProfileUrl = getUrl(profileThing, NS_CHAIMEDIA('userProfile').value);
    if (!userProfileUrl) {
        // Create a new user profile URL if it doesn't exist. Also create the corresponding dataset if needed.
        const datasetUrl = profileDataset.internal_resourceInfo.contentLocation ?? profileDataset.internal_resourceInfo.sourceIri;
        userProfileUrl = `${datasetUrl}#userProfile`;
        let newProfileDataset = profileDataset;
        let newProfileThing = profileThing;
        newProfileThing = setUrl(newProfileThing, NS_CHAIMEDIA('userProfile').value, userProfileUrl);
        newProfileDataset = setThing(newProfileDataset, newProfileThing);
        await saveSolidDatasetAt(webIdProfile, newProfileDataset, { fetch: authFetch });
    }

    // Get the user settings dataset using the user profile URL, or create it if it doesn't exist
    let userSettingsDataset = await getSolidDataset(userProfileUrl, { fetch: authFetch });
    if (!userSettingsDataset) {
        const dataset = createSolidDataset();
        userSettingsDataset = await saveSolidDatasetAt(userProfileUrl, dataset, { fetch: authFetch });
    }

    // Get the user setting thing from the user settings dataset, or create it if it doesn't exist
    let userSettingThing = getThing(userSettingsDataset, userProfileUrl);
    if (!userSettingThing) {
        userSettingThing = createThing({ url: userProfileUrl });
    }

    // Update the privacy profile value
    userSettingThing = setStringNoLocale(userSettingThing, NS_CHAIMEDIA('privacyProfile').value, privacyProfile);
    userSettingThing = setStringNoLocale(userSettingThing, NS_CHAIMEDIA('privacyProfileSetter').value, SETTER_CHAIFLIX);

    // Save the updated dataset
    userSettingsDataset = setThing(userSettingsDataset, userSettingThing);
    await saveSolidDatasetAt(userProfileUrl, userSettingsDataset, { fetch: authFetch });
}