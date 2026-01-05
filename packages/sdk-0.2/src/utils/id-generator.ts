import { IdGenerator } from "@/types";
import { v7 as uuidv7 } from "uuid";

export const idGeneratorUUIDv7: IdGenerator = () => {
  return uuidv7();
};
