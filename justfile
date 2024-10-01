build:
  bun install
  bunx json-refs resolve schema.json | bunx json-schema-to-zod | bunx prettier --parser typescript > schema.ts

# start the script
run CONFIG: build
  bun ./mod.ts --config {{CONFIG}}
