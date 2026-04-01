import {
  AbstractFileStorageCodec,
  FileStorage,
  FileStorageFileHandle,
} from "@/storages/file";
import { bufferToString } from "@/utils/string";
import z from "zod";
import {
  EchoBasicResponseSchemaV1,
  EchoBasicResponseV1,
  EchoBasicScoreSchemaV1,
  EchoBasicScoreV1,
  EchoBasicTestCaseSchemaV1,
  EchoBasicTestCaseV1,
} from "../schema-sets/echo.v1";

/**
 * Example custom file storage implementation that stores the benchmark entities in a custom formatted text file.
 *
 * The custom file format expected is:
 *
 * ```
 * BEGIN PEERBENCH ENTITY
 * id: <id>
 * namespace: <namespace>
 * kind: <kind>
 * schemaVersion: <schemaVersion>
 * json: <json>
 * END PEERBENCH ENTITY
 * ```
 */
export class EchoBasicTextStorage extends FileStorage<EchoBasicEntityV1> {
  constructor(config: { path: string }) {
    super({
      path: config.path,
      codec: new EchoBasicTextStorageCodec({
        schema: z.union([
          EchoBasicTestCaseSchemaV1,
          EchoBasicResponseSchemaV1,
          EchoBasicScoreSchemaV1,
        ]),
      }),
    });
  }
}

class EchoBasicTextStorageCodec extends AbstractFileStorageCodec<EchoBasicEntityV1> {
  private schema: z.ZodType<EchoBasicEntityV1>;

  constructor(config: { schema: z.ZodType<EchoBasicEntityV1> }) {
    super();
    this.schema = config.schema;
  }

  async readAll(params: {
    fileHandle: FileStorageFileHandle;
  }): Promise<EchoBasicEntityV1[]> {
    const wholeFile = new Uint8Array(await params.fileHandle.size());
    for await (const chunk of params.fileHandle.readChunks({
      chunkSize: 64 * 1024,
    })) {
      wholeFile.set(chunk.bytes, chunk.offset);
    }

    const text = bufferToString(wholeFile);
    const rawEntities = parseTextEntities(text);
    return rawEntities.map((entity) => this.schema.parse(entity));
  }
}

function parseTextEntities(text: string): unknown[] {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  const entities: unknown[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]?.trim();
    if (!line) {
      i++;
      continue;
    }

    if (line !== "BEGIN PEERBENCH ENTITY") {
      throw new Error(
        `Invalid file format: expected "BEGIN PEERBENCH ENTITY" at line ${i + 1}`
      );
    }
    i++;

    const record: Record<string, string> = {};
    while (i < lines.length) {
      const current = lines[i]?.trim();
      if (current === "END PEERBENCH ENTITY") {
        i++;
        break;
      }

      if (!current) {
        i++;
        continue;
      }

      const sepIndex = current.indexOf(":");
      if (sepIndex === -1) {
        throw new Error(
          `Invalid record line: expected "key: value" at line ${i + 1}`
        );
      }

      const key = current.slice(0, sepIndex).trim();
      const value = current.slice(sepIndex + 1).trim();
      record[key] = value;
      i++;
    }

    const jsonText = record["json"];
    if (!jsonText) {
      throw new Error('Invalid record: missing "json" field');
    }

    const parsed = JSON.parse(jsonText) as Record<string, unknown>;

    // Optional sanity check: header and payload should match.
    assertHeaderMatchesPayload(record, parsed);

    entities.push(parsed);
  }

  return entities;
}

function assertHeaderMatchesPayload(
  record: Record<string, string>,
  parsed: Record<string, unknown>
) {
  if (record["id"] && parsed["id"] && String(parsed["id"]) !== record["id"]) {
    throw new Error(`Invalid record: header id does not match payload id`);
  }

  if (
    record["namespace"] &&
    parsed["namespace"] &&
    String(parsed["namespace"]) !== record["namespace"]
  ) {
    throw new Error(
      `Invalid record: header namespace does not match payload namespace`
    );
  }

  if (
    record["kind"] &&
    parsed["kind"] &&
    String(parsed["kind"]) !== record["kind"]
  ) {
    throw new Error(`Invalid record: header kind does not match payload kind`);
  }

  if (record["schemaVersion"] && parsed["schemaVersion"]) {
    const headerVersion = Number(record["schemaVersion"]);
    if (
      Number.isFinite(headerVersion) &&
      Number(parsed["schemaVersion"]) !== headerVersion
    ) {
      throw new Error(
        `Invalid record: header schemaVersion does not match payload schemaVersion`
      );
    }
  }
}

type EchoBasicEntityV1 =
  | EchoBasicTestCaseV1
  | EchoBasicResponseV1
  | EchoBasicScoreV1;
