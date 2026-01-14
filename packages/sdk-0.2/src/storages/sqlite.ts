import Database from "better-sqlite3";
import { AbstractStorage } from "@/storages/abstract";

export class SQLiteStorage<TObject> extends AbstractStorage<TObject> {
  protected readonly path: string;
  protected readonly codec: AbstractSQLiteStorageCodec<TObject>;

  protected db: SQLiteDatabase | undefined;

  constructor(config: {
    path: string;
    codec: AbstractSQLiteStorageCodec<TObject>;
  }) {
    super();
    this.path = config.path;
    this.codec = config.codec;
  }

  async init(params?: unknown): Promise<void> {
    this.db = new Database(this.path);
    await this.codec.init?.({ db: this.db, params });
  }

  override async read(key: string, params?: unknown): Promise<TObject | null> {
    this.assertInitialized();
    return await this.codec.read({ db: this.db, key, params });
  }

  override async readAll(params?: unknown): Promise<TObject[]> {
    this.assertInitialized();
    return await this.codec.readAll({ db: this.db, params });
  }

  override async write(
    key: string,
    value: TObject,
    params?: unknown
  ): Promise<unknown> {
    this.assertInitialized();
    return await this.codec.write({ db: this.db, key, value, params });
  }

  close(): void {
    this.db?.close();
    this.db = undefined;
  }

  protected assertInitialized(): asserts this is this & { db: SQLiteDatabase } {
    if (!this.db) {
      throw new Error("SQLite database is not initialized");
    }
  }
}

export abstract class AbstractSQLiteStorageCodec<TObject> {
  init?(params: { db: SQLiteDatabase; params?: unknown }): Promise<void> | void;

  abstract read(params: {
    db: SQLiteDatabase;
    key: string;
    params?: unknown;
  }): Promise<TObject | null>;

  abstract readAll(params: {
    db: SQLiteDatabase;
    params?: unknown;
  }): Promise<TObject[]>;

  abstract write(params: {
    db: SQLiteDatabase;
    key: string;
    value: TObject;
    params?: unknown;
  }): Promise<unknown>;
}

type SQLiteDatabase = import("better-sqlite3").Database;
