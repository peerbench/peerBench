/**
 * Removes the `did:<entity type>:` prefix from the given string and returns the rest.
 */
export function removeDIDPrefix(did: string) {
  if (!did.startsWith("did:")) {
    return did;
  }

  const parts = did.split(":");
  if (parts.length < 3) {
    return did;
  }

  // Get rid out of the prefix
  return parts.slice(2).join(":");
}
