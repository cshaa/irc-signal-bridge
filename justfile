# Remove Bun after this is fixed: https://github.com/denoland/deno/issues/26196
build:
  deno install
  bunx json-refs resolve schema.json | deno run npm:json-schema-to-zod | deno run -A npm:prettier --parser typescript > schema.ts

# start the script
run CONFIG: build
  deno run -A ./mod.ts --config {{CONFIG}}
