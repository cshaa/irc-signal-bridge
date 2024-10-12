[private]
default:
  @just --list

format:
  deno fmt

build: format
  deno install
  # Remove Bun after this is fixed: https://github.com/denoland/deno/issues/26196
  bunx json-refs resolve schema.json | deno run npm:json-schema-to-zod | deno run -A npm:prettier --parser typescript > schema.ts

# start the script
run CONFIG: build
  deno run -A ./mod.ts --config {{CONFIG}}

docker-build: build
  docker build -t irc-signal-bridge .

docker-run: docker-build
  docker run --rm -v ~/.local/share/signal-cli:/root/.local/share/signal-cli -v $(pwd):/config --name irc-signal-bridge irc-signal-bridge

docker-stop:
  docker stop irc-signal-bridge
