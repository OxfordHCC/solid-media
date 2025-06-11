import {
  SolidDataset,
  WithAcl,
  WithAccessibleAcl,
  WithServerResourceInfo,
  getSolidDatasetWithAcl,
  createContainerAt,
  hasResourceAcl,
  createAcl,
  saveAclFor,
  setAgentDefaultAccess,
  setAgentResourceAccess,
  setGroupDefaultAccess,
  setGroupResourceAccess,
  setPublicDefaultAccess,
  setPublicResourceAccess,
  getGroupAccess,
  getPublicAccess,
} from "@inrupt/solid-client";
import { READ_ACCESS, FULL_ACCESS } from "../../features/movies/types";

export async function getOrCreateMoviesContainerWithAcl(
  pod: string,
  fetch: typeof window.fetch
): Promise<
  SolidDataset & WithAcl & WithAccessibleAcl & WithServerResourceInfo
> {
  try {
    return (await getSolidDatasetWithAcl(`${pod}/movies/`, { fetch })) as any;
  } catch {
    return (await createContainerAt(`${pod}/movies/`, { fetch })) as any;
  }
}

export async function setupMoviesAcl(
  moviesAclDataset: SolidDataset &
    WithAcl &
    WithAccessibleAcl &
    WithServerResourceInfo,
  pod: string,
  webID: string,
  friends: string[],
  fetch: typeof window.fetch
): Promise<void> {
  try {
    // Initialize ACL if it doesn't exist
    if (!hasResourceAcl(moviesAclDataset)) {
      await createInitialMoviesAcl(
        moviesAclDataset,
        pod,
        webID,
        friends,
        fetch
      );
    }

    // Update ACL permissions
    await updateMoviesAclPermissions(moviesAclDataset, pod, friends, fetch);
  } catch (error) {
    console.log("Resource ACL isn't setup yet - first sign-up");
  }
}

export async function createInitialMoviesAcl(
  moviesAclDataset: SolidDataset &
    WithAcl &
    WithAccessibleAcl &
    WithServerResourceInfo,
  pod: string,
  webID: string,
  friends: string[],
  fetch: typeof window.fetch
): Promise<void> {
  let moviesAcl = createAcl(moviesAclDataset);

  // Set group access
  moviesAcl = setGroupDefaultAccess(
    moviesAcl,
    `${pod}/friends#group`,
    READ_ACCESS
  );
  moviesAcl = setGroupResourceAccess(
    moviesAcl,
    `${pod}/friends#group`,
    READ_ACCESS
  );

  // Set public access
  moviesAcl = setPublicDefaultAccess(moviesAcl, READ_ACCESS);
  moviesAcl = setPublicResourceAccess(moviesAcl, READ_ACCESS);

  // Set friend access
  for (const id of friends) {
    moviesAcl = setAgentDefaultAccess(moviesAcl, id, READ_ACCESS);
    moviesAcl = setAgentResourceAccess(moviesAcl, id, READ_ACCESS);
  }

  // Set full access for the user
  moviesAcl = setAgentDefaultAccess(moviesAcl, webID, FULL_ACCESS);
  moviesAcl = setAgentResourceAccess(moviesAcl, webID, FULL_ACCESS);

  await saveAclFor(moviesAclDataset, moviesAcl, { fetch });
}
export async function updateMoviesAclPermissions(
  moviesAclDataset: SolidDataset &
    WithAcl &
    WithAccessibleAcl &
    WithServerResourceInfo,
  pod: string,
  friends: string[],
  fetch: typeof window.fetch
): Promise<void> {
  const currentGlobalAccess = getPublicAccess(moviesAclDataset);
  const currentGroupAccess = getGroupAccess(
    moviesAclDataset,
    `${pod}/friends#group`
  );

  if (
    (currentGlobalAccess && !currentGlobalAccess["read"]) ||
    (currentGroupAccess && !currentGroupAccess["read"])
  ) {
    let moviesAcl = createAcl(moviesAclDataset);
    moviesAcl = setGroupDefaultAccess(
      moviesAcl,
      `${pod}/friends#group`,
      READ_ACCESS
    );
    moviesAcl = setGroupResourceAccess(
      moviesAcl,
      `${pod}/friends#group`,
      READ_ACCESS
    );
    moviesAcl = setPublicDefaultAccess(moviesAcl, READ_ACCESS);
    moviesAcl = setPublicResourceAccess(moviesAcl, READ_ACCESS);
    await saveAclFor(moviesAclDataset, moviesAcl, { fetch });
  }
}
