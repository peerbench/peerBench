export const apiFetcher = async <T = any>(url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const stream = res.clone();
    const body = await stream.text().catch(() => `Unknown Error`);

    throw new Error(body);
  }

  return res.json() as T;
};
