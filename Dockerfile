FROM oven/bun:debian
RUN apt-get update
RUN apt-get install wget -y

# install signal-cli, see: https://github.com/AsamK/signal-cli?tab=readme-ov-file#install-system-wide-on-linux
ENV SIGNAL_CLI_VERSION=0.13.6
RUN wget https://github.com/AsamK/signal-cli/releases/download/v"${SIGNAL_CLI_VERSION}"/signal-cli-"${SIGNAL_CLI_VERSION}".tar.gz
RUN tar xf signal-cli-"${SIGNAL_CLI_VERSION}".tar.gz -C /opt
RUN ln -sf /opt/signal-cli-"${SIGNAL_CLI_VERSION}"/bin/signal-cli /usr/local/bin/

COPY package.json .npmrc bun.lockb ./
RUN bun install

COPY . .
ENTRYPOINT [ "./mod.ts" ]
