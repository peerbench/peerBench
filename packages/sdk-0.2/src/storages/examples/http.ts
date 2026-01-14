import z from "zod";
import { AbstractHttpStorageCodec, HttpStorage } from "@/storages/http";

async function example() {
  const schema = z.object({
    id: z.string(),
    name: z.string(),
  });

  const storage = new HttpStorage({
    url: "https://example.com/users.json",
    codec: new JsonArrayCodec({ schema }),
  });

  const users = await storage.readAll();
  console.log(users.length);
}

void example();

class JsonArrayCodec<TObject> extends AbstractHttpStorageCodec<TObject> {
  private readonly schema: z.ZodType<TObject>;

  constructor(params: { schema: z.ZodType<TObject> }) {
    super();
    this.schema = params.schema;
  }

  override async readAll(params: { response: Response }): Promise<TObject[]> {
    const json = await params.response.json();
    return this.schema.array().parse(json);
  }
}
