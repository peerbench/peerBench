const RAW_REQUEST_METADATA_KEY = "rawRequest";

type RawRequestMetadata = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  response?: {
    status: number;
    statusText: string;
  };
};

export { RAW_REQUEST_METADATA_KEY, type RawRequestMetadata };
