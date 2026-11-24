import { useCallback } from "react";
import {
  Arguments,
  MutatorCallback,
  MutatorOptions,
  unstable_serialize,
  useSWRConfig,
} from "swr";
import { unstable_serialize as unstable_serializeInfinite } from "swr/infinite";

/**
 * Temporary solution to invalidate the SWR cache including infinite keys.
 * More info:
 * - https://github.com/vercel/swr/pull/4167
 * - https://github.com/vercel/swr/issues/4149
 * - https://github.com/vercel/swr/issues/1670
 * - https://github.com/vercel/swr/issues/2281
 */
export function useGlobalSWRMutate<Data = any, MutationData = Data>() {
  const { mutate } = useSWRConfig();

  return useCallback(
    async (
      matcherOrKey: Arguments | ((key?: Arguments) => boolean),
      data?:
        | MutationData
        | Promise<MutationData>
        | MutatorCallback<MutationData>,
      opts?:
        | boolean
        | (MutatorOptions<Data, MutationData> & {
            isInfinite?: boolean;
          })
    ) => {
      const isInfinite = typeof opts === "object" && opts?.isInfinite;
      const keys: Arguments[] = [];

      // Collect all the raw keys (not the serialized ones) without invalidating the cache
      await mutate((key) => {
        keys.push(key);
        return false;
      });

      await Promise.all(
        keys.map(async (key) => {
          const serializedKey = isInfinite
            ? unstable_serializeInfinite(() => key)
            : unstable_serialize(key);

          if (typeof matcherOrKey === "function") {
            const isMatched = matcherOrKey(key);
            if (!isMatched) return;

            return mutate(serializedKey, data, opts);
          } else {
            const serializedMatcherOrKey = isInfinite
              ? unstable_serializeInfinite(() => matcherOrKey)
              : unstable_serialize(matcherOrKey);

            if (serializedKey === serializedMatcherOrKey) {
              return mutate(serializedKey, data, opts);
            }
          }
        })
      );
    },
    [mutate]
  );
}
