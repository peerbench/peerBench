import z from "zod";
import { SQLiteStorage, AbstractSQLiteStorageCodec } from "@/storages/sqlite";

class JsonTableCodec<
  TObject extends { id: string },
> extends AbstractSQLiteStorageCodec<TObject> {
  private readonly table: string;
  private readonly schema: z.ZodType<TObject>;

  constructor(params: { table: string; schema: z.ZodType<TObject> }) {
    super();
    this.table = params.table;
    this.schema = params.schema;
  }

  override init(params: { db: SQLiteDatabase }): void {
    params.db.exec(
      [
        `CREATE TABLE IF NOT EXISTS ${escapeIdentifier(this.table)} (`,
        `  id TEXT PRIMARY KEY,`,
        `  json TEXT NOT NULL`,
        `);`,
      ].join("\n")
    );
  }

  override async read(params: {
    db: SQLiteDatabase;
    key: string;
  }): Promise<TObject | null> {
    const row = params.db
      .prepare<
        { id: string },
        { json: string }
      >(`SELECT json FROM ${escapeIdentifier(this.table)} WHERE id = @id`)
      .get({ id: params.key });

    if (!row) return null;
    return this.schema.parse(JSON.parse(row.json));
  }

  override async readAll(params: { db: SQLiteDatabase }): Promise<TObject[]> {
    const rows = params.db
      .prepare<
        unknown[],
        { json: string }
      >(`SELECT json FROM ${escapeIdentifier(this.table)} ORDER BY id`)
      .all();

    return rows.map((row) => {
      return this.schema.parse(JSON.parse(row.json));
    });
  }

  override async write(params: {
    db: SQLiteDatabase;
    key: string;
    value: TObject;
  }): Promise<unknown> {
    const json = JSON.stringify(this.schema.parse(params.value));

    params.db
      .prepare<{ id: string; json: string }>(
        `INSERT INTO ${escapeIdentifier(this.table)} (id, json) VALUES (@id, @json)
         ON CONFLICT(id) DO UPDATE SET json = excluded.json`
      )
      .run({ id: params.key, json });

    return undefined;
  }
}

type SQLiteDatabase = import("better-sqlite3").Database;

async function example() {
  const userSchema = z.object({
    id: z.string(),
    name: z.string(),
  });

  const storage = new SQLiteStorage({
    path: "./example.sqlite",
    codec: new JsonTableCodec({
      table: "users",
      schema: userSchema,
    }),
  });

  await storage.init();
  await storage.write("user-1", { id: "user-1", name: "Ada" });
  await storage.write("user-2", { id: "user-2", name: "Linus" });

  const one = await storage.read("user-1");
  console.log(one);

  const all = await storage.readAll();
  console.log(all);
}

void example();

function escapeIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}`);
  }
  return identifier;
}
