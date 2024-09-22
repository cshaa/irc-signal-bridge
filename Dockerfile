FROM oven/bun:debian
RUN apt-get update
RUN apt-get install -y curl

RUN curl -sL -o /etc/apt/trusted.gpg.d/morph027-signal-cli.asc https://packaging.gitlab.io/signal-cli/gpg.key
RUN echo "deb https://packaging.gitlab.io/signal-cli signalcli main" | tee /etc/apt/sources.list.d/morph027-signal-cli.list
RUN apt-get update
RUN apt-get install signal-cli-native

COPY package.json .npmrc bun.lockb ./
RUN bun install

COPY . .
ENTRYPOINT [ "./mod.ts" ]
