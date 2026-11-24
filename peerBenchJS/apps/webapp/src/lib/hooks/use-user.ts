import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export function useUser() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [user, setUser] = useState<User | undefined>();
  const client = createClient();

  useEffect(() => {
    client.auth
      .getUser()
      .then(({ data, error }) => {
        if (error) {
          console.error("Error while getting User:", error);
          setError(error instanceof Error ? error.message : "Unknown error");
        } else {
          setUser(data.user || undefined);
        }
      })
      .catch((err) => {
        console.error("Error while getting User:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, isLoading, error };
}
