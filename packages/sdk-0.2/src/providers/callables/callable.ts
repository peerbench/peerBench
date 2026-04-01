import { AbstractProvider } from "../abstract";

export interface Callable<TProvider = AbstractProvider> {
  readonly provider: TProvider;
}
