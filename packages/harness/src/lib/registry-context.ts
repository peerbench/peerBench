import type { Registry, RunnerEntry, StorageEntry, ProviderEntry, ScorerEntry } from "@peerbench/core";
import type { Registries } from "./run-executor";

let _registries: Registries | null = null;

export function setRegistries(registries: Registries): void {
  _registries = registries;
}

export function getRegistries(): Registries {
  if (!_registries) {
    throw new Error("Registries not initialized. Call setRegistries() first (typically in PeerBench constructor).");
  }
  return _registries;
}
