import { PeerbenchError } from "./peerbench";

export class CatalogItemNotFoundError extends PeerbenchError {
  constructor(public readonly itemName: string | { message: string }) {
    super(
      typeof itemName === "string"
        ? `Item with name "${itemName}" not found in the catalog`
        : itemName.message,
      {
        code: 100,
      }
    );
  }
}

export class CatalogItemHasNoInstantiateMethodError extends PeerbenchError {
  constructor(public readonly itemName: string) {
    super(`Item with name "${itemName}" has no instantiate method`, {
      code: 101,
    });
  }
}
