import {
  Prompt,
  PromptResponse,
  PromptScore,
  PromptResponseSchema,
} from "@/types";
import { AbstractRegistry } from "./abstract/abstract-registry";
import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";
import { sleep } from "@/utils/sleep";
import { Account } from "viem";
import { calculateSHA256, calculateCID, stableStringify } from "@/utils";
import axios from "axios";

/**
 * Registry implementation for peerBench server
 */
export class PeerBenchRegistry extends AbstractRegistry {
  // TODO: Find a better way to force sub classes to define a static identifier
  // Static accessor for the identifier
  static readonly identifier = "peerbench";
  readonly identifier = PeerBenchRegistry.identifier;

  private token?: string;
  private supabaseClient?: SupabaseClient;
  private apiURL: string;
  private session: Session | null = null;
  private readonly email?: string;
  private readonly password?: string;
  private readonly authMethod?: "token" | "cookie";
  private refreshTokenInterval?: NodeJS.Timeout;
  private isRefreshingToken = false;
  private isClosed = false;
  private isInitialized = false;
  private tokenRefresher: boolean;

  constructor(options: PeerBenchRegistryOptions) {
    super();

    this.tokenRefresher = options.tokenRefresher ?? false;
    this.authMethod = options.authMethod ?? "token";
    this.apiURL = options.peerbenchApiURL;

    if (options.authMethod === "token" || options.authMethod === undefined) {
      this.supabaseClient = createClient(
        options.peerbenchSupabaseURL,
        options.peerbenchSupabaseAnonKey
      );

      this.email = options.email;
      this.password = options.password;
    }
  }

  async uploadPrompts(prompts: Prompt[], options: UploadPromptsOptions) {
    if (prompts.length === 0) {
      return 0;
    }

    await this.init();

    // Sign each Prompt if the account is provided
    const account = options?.account;
    if (account && account.signMessage) {
      prompts = await Promise.all(
        prompts.map(async (prompt) => {
          const promptWithSignature: typeof prompt & SignatureFields = {
            ...prompt,
          };

          const promptStringified = stableStringify(prompt)!;
          const hash = await calculateCID(promptStringified).then((c) =>
            c.toString()
          );
          const signature = await account.signMessage({
            message: hash,
          });

          promptWithSignature.signature = signature;
          promptWithSignature.publicKey = account.address;
          promptWithSignature.signatureType = "cid";
          promptWithSignature.keyType = "secp256k1n";

          return promptWithSignature;
        })
      );
    }

    const res = await axios.post(
      `${this.apiURL}/api/v2/prompts`,
      {
        promptSetId: options.promptSetId,
        prompts,
      },
      {
        withCredentials: this.authMethod === "cookie",
        headers: {
          Authorization:
            this.authMethod === "token" ? `Bearer ${this.token}` : undefined,
          "Content-Type": "application/json",
        },
      }
    );

    if (res.status !== 200) {
      throw new Error(
        `Failed to upload Prompts: ${res?.data?.message || JSON.stringify(res?.data || "No response available")}`
      );
    }

    return prompts.length;
  }

  async uploadResponses(
    responses: PromptResponse[],
    options?: UploadResponsesOptions
  ): Promise<number> {
    if (responses.length === 0) {
      return 0;
    }

    await this.init();

    // Sign each Response if the account is provided
    const account = options?.account;
    if (account && account.signMessage) {
      responses = await Promise.all(
        responses.map(async (response) => {
          const responseWithSignature: typeof response & SignatureFields = {
            ...response,
          };

          const responseStringified = stableStringify(response)!;
          const hash = await calculateCID(responseStringified).then((c) =>
            c.toString()
          );
          const signature = await account.signMessage({
            message: hash,
          });

          responseWithSignature.signature = signature;
          responseWithSignature.publicKey = account.address;
          responseWithSignature.signatureType = "cid";
          responseWithSignature.keyType = "secp256k1n";

          return responseWithSignature;
        })
      );
    }

    // Submit the responses directly to v2 API
    const res = await axios.post(
      `${this.apiURL}/api/v2/responses`,
      { responses },
      {
        withCredentials: this.authMethod === "cookie",
        headers: {
          Authorization:
            this.authMethod === "token" ? `Bearer ${this.token}` : undefined,
          "Content-Type": "application/json",
        },
      }
    );

    if (res.status !== 200) {
      throw new Error(
        `Failed to upload Responses: ${res?.data?.message || JSON.stringify(res?.data || "No response available")}`
      );
    }

    return responses.length;
  }

  async uploadScores(
    scores: PromptScore[],
    options?: UploadScoresOptions
  ): Promise<number> {
    if (scores.length === 0) {
      return 0;
    }

    await this.init();

    // Calculate hash registrations for each Score
    scores = await Promise.all(
      scores.map(async (score) => {
        if (!score.prompt) {
          throw new Error("Score must have a prompt for hash registration");
        }
        if (!score.response) {
          throw new Error("Score must have data for hash registration");
        }

        // Calculate prompt hash registrations
        const promptStringified = stableStringify(score.prompt)!;
        const promptHashSha256Registration =
          await calculateSHA256(promptStringified);
        const promptHashCIDRegistration = await calculateCID(
          promptStringified
        ).then((c) => c.toString());

        // Calculate response hash registrations
        // Score object derives from Response so we can easily extract the Response object using Zod schema
        const responseObject = PromptResponseSchema.parse(score);
        const responseStringified = stableStringify(responseObject)!;
        const responseHashSha256Registration =
          await calculateSHA256(responseStringified);
        const responseHashCIDRegistration = await calculateCID(
          responseStringified
        ).then((c) => c.toString());

        const scoreWithRegistration: typeof score &
          ScoreHashRegistrations &
          SignatureFields = {
          ...score,
          responseHashSha256Registration,
          responseHashCIDRegistration,
          promptHashSha256Registration,
          promptHashCIDRegistration,
        };

        // Sign the score if account is provided
        if (options?.account && options.account.signMessage) {
          const scoreStringified = stableStringify(score)!;
          const hash = await calculateCID(scoreStringified).then((c) =>
            c.toString()
          );
          const signature = await options.account.signMessage({
            message: hash,
          });

          scoreWithRegistration.signature = signature;
          scoreWithRegistration.publicKey = options.account.address;
          scoreWithRegistration.signatureType = "cid";
          scoreWithRegistration.keyType = "secp256k1n";
        }

        return scoreWithRegistration;
      })
    );

    // Submit the scores directly to v2 API
    const res = await axios.post(
      `${this.apiURL}/api/v2/scores`,
      { scores },
      {
        withCredentials: this.authMethod === "cookie",
        headers: {
          Authorization:
            this.authMethod === "token" ? `Bearer ${this.token}` : undefined,
          "Content-Type": "application/json",
        },
      }
    );

    if (res.status !== 200) {
      throw new Error(
        `Failed to upload Scores: ${res?.data?.message || JSON.stringify(res?.data || "No response available")}`
      );
    }

    return scores.length;
  }

  /**
   * Clears the interval execution for refreshing the token.
   */
  async clearRefreshInterval() {
    this.isClosed = true;
    clearInterval(this.refreshTokenInterval!);
  }

  private async init() {
    if (this.isClosed || this.isInitialized || this.authMethod === "cookie") {
      return;
    }

    const authData = await this.login(this.email!, this.password!);

    this.session = authData?.session || null;
    this.token = this.session?.access_token;

    if (!this.token) {
      throw new Error(
        `Failed authentication with peerBench: No token received`
      );
    }

    if (this.tokenRefresher) {
      // Refresh the token 15 minutes before it expires
      this.refreshTokenInterval = setInterval(
        () => this.refreshToken(),
        (this.session!.expires_in - 15 * 60) * 1000
      );
    }

    this.isInitialized = true;
  }

  /**
   * Refreshes the token if it is about to expire.
   */
  private async refreshToken() {
    if (this.isClosed || this.authMethod === "cookie") {
      return;
    }

    if (this.isRefreshingToken) {
      // Interval is already set
      return;
    }

    this.isRefreshingToken = true;
    while (!this.isClosed) {
      try {
        const { data, error } = await this.supabaseClient!.auth.refreshSession(
          this.session || undefined
        );
        if (error) {
          throw new Error(error.message);
        }

        this.session = data.session;
        this.token = this.session?.access_token;
        break;
      } catch (err) {
        console.error(`PeerBenchRegistry: Failed to refresh token`, err);
        console.error(`PeerBenchRegistry: Retrying in 10 seconds`);
        await sleep(10_000);
      }
    }
    this.isRefreshingToken = false;
  }

  private async login(email: string, password: string) {
    const { data, error } = await this.supabaseClient!.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(`Failed login to peerBench: ${error.message}`);
    }

    if (!data.session) {
      throw new Error(`No session returned from peerBench authentication`);
    }

    return data;
  }
}

export type PeerBenchRegistryOptionsBase = {
  peerbenchApiURL: string;

  /**
   * If you are using this instance in a browser environment, you can
   * use `cookie` approach to authenticate requests. In this case the
   * user must be logged in via Supabase auth.
   * @default "token"
   */
  authMethod?: "token" | "cookie";

  /**
   * Supabase tokens must be refreshed periodically.
   * But if the class usage is short-lived, it's not necessary to start
   * a background interval for refreshing the token.
   * @default false
   */
  tokenRefresher?: boolean;

  peerbenchSupabaseURL?: string;
  peerbenchSupabaseAnonKey?: string;
  email?: string;
  password?: string;
};

export type PeerBenchRegistryOptions =
  | (PeerBenchRegistryOptionsBase & {
      authMethod?: "token";
      tokenRefresher?: boolean;
      peerbenchSupabaseURL: string;
      peerbenchSupabaseAnonKey: string;
      email: string;
      password: string;
    })
  | (PeerBenchRegistryOptionsBase & {
      authMethod: "cookie";
      tokenRefresher?: never;
      peerbenchSupabaseURL?: never;
      peerbenchSupabaseAnonKey?: never;
      email?: never;
      password?: never;
    });

/**
 * Signature fields that can be added to prompts, responses, or scores
 * when signing with an account.
 */
export type SignatureFields = {
  signature?: string;
  publicKey?: string;
  signatureType?: "sha256" | "cid";
  keyType?: "secp256k1n";
};

/**
 * Hash registration fields required for score uploads
 */
export type ScoreHashRegistrations = {
  responseHashSha256Registration: string;
  responseHashCIDRegistration: string;
  promptHashSha256Registration: string;
  promptHashCIDRegistration: string;
};

/**
 * Options for uploading prompts
 */
export type UploadPromptsOptions = {
  promptSetId: number;
  account?: Account;
};

/**
 * Options for uploading responses
 */
export type UploadResponsesOptions = {
  account?: Account;
};

/**
 * Options for uploading scores
 */
export type UploadScoresOptions = {
  account?: Account;
};
