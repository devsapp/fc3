ARG TAG="latest"
FROM aliyunfc/runtime-custom.debian10:${TAG}
ENV DEBIAN_FRONTEND=noninteractive

RUN mkdir -p /mnt/auto

RUN apt-get update \
    && apt-get --no-install-recommends  install -y apt-utils ca-certificates \
    dialog \
    clang \
    build-essential \
    libgmp3-dev \
    sudo \
    && rm -rf /var/lib/apt/lists/*

RUN echo "ALL ALL=NOPASSWD: ALL" >> /etc/sudoers

RUN mv /usr/bin/update-alternatives  /usr/bin/update-alternatives-origin \
    && ((test -f /usr/bin/pycompile && mv /usr/bin/pycompile  /usr/bin/pycompile-origin) || true)

COPY commons/update-alternatives  /usr/bin/ 

COPY commons/pycompile  /usr/bin/

RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/

RUN ln -s /var/fc/lang/python3.10/bin/pip /usr/local/bin/pip


RUN mv /etc/apt/sources.list /etc/apt/sources.list.bak
COPY commons/debian-buster-sources.list /etc/apt/sources.list

COPY commons/apt-get-install.sh /usr/bin/apt-get-install

WORKDIR /code
