FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive
ARG USERNAME=agent
ARG UID=1000
ARG GID=1000
ARG NODE_MAJOR=22
ARG PI_VERSION

ENV TZ=Etc/UTC \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    SHELL=/bin/bash \
    HOME=/home/${USERNAME} \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    NUGET_XMLDOC_MODE=skip \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    YARN_CACHE_FOLDER=/cache/yarn \
    npm_config_cache=/cache/npm \
    PIP_CACHE_DIR=/cache/pip \
    NUGET_PACKAGES=/cache/nuget \
    DOTNET_CLI_HOME=/cache/dotnet \
    UV_CACHE_DIR=/cache/uv

SHELL ["/bin/bash", "-lc"]

# Base OS tools + Chromium/Playwright runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl wget gnupg unzip xz-utils zip jq less git git-lfs procps file \
    openssh-client \
    python3 python3-pip python3-venv pipx \
    libasound2t64 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2t64 \
    libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 \
    libpango-1.0-0 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 \
    libxext6 libxfixes3 libxkbcommon0 libxrandr2 libxrender1 libxshmfence1 \
    fonts-liberation fonts-noto-color-emoji xdg-utils \
    fd-find ripgrep \
    && rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/bin/fdfind /usr/local/bin/fd

# Microsoft apt repo for .NET 10 SDK
RUN wget https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -O /tmp/packages-microsoft-prod.deb \
    && dpkg -i /tmp/packages-microsoft-prod.deb \
    && rm /tmp/packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y --no-install-recommends dotnet-sdk-10.0 \
    && rm -rf /var/lib/apt/lists/*

# Node.js + npm from NodeSource, then enable Corepack
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
      | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
      > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && corepack enable \
    && rm -rf /var/lib/apt/lists/*

# uv via official installer
RUN curl -LsSf https://astral.sh/uv/install.sh | sh \
    && install -Dm755 /home/agent/.local/bin/uv /usr/local/bin/uv \
    && install -Dm755 /home/agent/.local/bin/uvx /usr/local/bin/uvx

# Install Chromium only for Playwright/browser test usage
RUN npx -y playwright@latest install --with-deps chromium

RUN echo "Installing Pi ${PI_VERSION}"
RUN npm install -g @mariozechner/pi-coding-agent@${PI_VERSION}

# Non-root user
RUN useradd --uid "${UID}" --gid "${GID}" -m -s /bin/bash "${USERNAME}" || \
    useradd -m -s /bin/bash "${USERNAME}"

# Shared mounts/caches expected by runtime wrapper
RUN mkdir -p \
    /repos \
    /cache/yarn \
    /cache/npm \
    /cache/pip \
    /cache/nuget \
    /cache/dotnet \
    /cache/uv \
    /ms-playwright \
    && chown -R ${USERNAME}:${USERNAME} /repos /cache /ms-playwright /home/${USERNAME}

USER ${USERNAME}
WORKDIR /repos

# Pre-create common writable locations in fake home
RUN mkdir -p \
    ${HOME}/.cache \
    ${HOME}/.npm \
    ${HOME}/.nuget/packages \
    ${HOME}/.local/bin \
    ${HOME}/.config \
    ${HOME}/.yarn \
    ${HOME}/.ssh

# Keep git local-only by default inside the container
RUN git config --global --unset-all credential.helper || true \
    && git config --global credential.helper "" \
    && git config --global init.defaultBranch main \
    && git config --global core.autocrlf input \
    && git config --global advice.detachedHead false

# Optional sanity checks
RUN node --version \
    && npm --version \
    && yarn --version \
    && corepack --version \
    && dotnet --info \
    && uv --version \
    && git --version \
    && rg --version \
    && fd --version \
    && pi --version

CMD ["bash"]
