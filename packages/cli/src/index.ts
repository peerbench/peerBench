const commands: Record<string, () => Promise<void>> = {
  init: async () => {
    console.log("peerbench init — scaffold a new PeerBench project");
    console.log("(not yet implemented)");
  },
  dev: async () => {
    console.log("peerbench dev — start dev server with hot reload");
    console.log("(not yet implemented)");
  },
  build: async () => {
    console.log("peerbench build — production build");
    console.log("(not yet implemented)");
  },
  "db:migrate": async () => {
    console.log("peerbench db:migrate — run Prisma migrations");
    console.log("(not yet implemented)");
  },
  "db:studio": async () => {
    console.log("peerbench db:studio — open Prisma Studio");
    console.log("(not yet implemented)");
  },
  help: async () => {
    console.log(`
peerbench — AI evaluation platform

Commands:
  init          Scaffold a new PeerBench project
  dev           Start dev server with hot reload
  build         Production build
  db:migrate    Run Prisma migrations
  db:studio     Open Prisma Studio

Usage:
  peerbench <command>
    `);
  },
};

async function run() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "help";

  const handler = commands[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    await commands.help!();
    process.exit(1);
  }

  await handler();
}

export { run };
