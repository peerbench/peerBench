#!/usr/bin/env node
import("@peerbench/cli").then((cli) => cli.run()).catch((err) => {
  console.error(err);
  process.exit(1);
});
