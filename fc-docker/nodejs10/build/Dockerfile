ARG TAG="latest"
FROM aliyunfc/runtime-nodejs10:${TAG}

RUN mkdir -p /mnt/auto
RUN apt-get update \
    && apt-get --no-install-recommends  install -y apt-utils ca-certificates \
    dialog \
    vim \ 
    cmake \
    zip \
    unzip \
    clang \
    build-essential \
    libgmp3-dev \
    python2.7-dev \
    sudo \
    && rm -rf /var/lib/apt/lists/*

RUN echo "ALL ALL=NOPASSWD: ALL" >> /etc/sudoers

RUN mv /usr/bin/update-alternatives  /usr/bin/update-alternatives-origin \
    && ((test -f /usr/bin/pycompile && mv /usr/bin/pycompile  /usr/bin/pycompile-origin) || true)

COPY commons/update-alternatives  /usr/bin/
COPY commons/pycompile  /usr/bin/

RUN npm config set registry https://registry.npmmirror.com

RUN npm install -g yarn

RUN mv /etc/apt/sources.list /etc/apt/sources.list.bak
COPY commons/debian-stretch-aliyun-sources.list /etc/apt/sources.list

COPY commons/apt-get-install.sh /usr/bin/apt-get-install

WORKDIR /code

CMD ["npm", "rebuild"]
