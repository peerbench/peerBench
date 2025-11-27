import { useEffect, useState } from "react";

/**
 * Returns the `document.body` when the component is mounted.
 * It is useful to prevent hydration errors.
 */
export function useDocumentBody() {
  const [element, setElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setElement(document.body);
  }, []);

  return element;
}
