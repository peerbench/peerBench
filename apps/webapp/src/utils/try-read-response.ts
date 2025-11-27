/**
 * Tries to read the body of the given response object as
 * a string. Fallback to the given fallback string if the
 * response body is available. Useful when if the request
 * if failed with a status other than 200 and you want to
 * get the message from the response object.
 */
export async function tryReadResponse(
  response: Response,
  fallback = "[no response body]"
) {
  let message = fallback;

  // If the returned response is a JSON object, try to parse
  // `message` field specifically because it may have a human-readable
  // message. Otherwise just try to return the body as a string.
  const jsonClone = response.clone();
  const jsonBody = await jsonClone.json().catch(() => null);
  if (jsonBody && jsonBody?.message) {
    message = jsonBody.message;
  } else {
    const textClone = response.clone();
    const textBody = await textClone.text().catch(() => null);
    if (textBody) {
      message = textBody;
    }
  }

  return message;
}
