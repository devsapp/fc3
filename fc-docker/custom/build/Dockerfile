ARG TAG="latest"
FROM aliyunfc/runtime-custom:${TAG}
ENV DEBIAN_FRONTEND=noninteractive

RUN mkdir -p /mnt/auto

RUN apt-get update \
    && apt-get --no-install-recommends  install -y apt-utils ca-certificates \
    dialog \
    clang \
    build-essential \
    libgmp3-dev \
    sudo \
    libffi-dev \
    zlibc \
    zlib1g \
    zlib1g-dev \
    libssl-dev \
    libreadline-dev \
    && rm -rf /var/lib/apt/lists/*

RUN echo "ALL ALL=NOPASSWD: ALL" >> /etc/sudoers

RUN mv /usr/bin/update-alternatives  /usr/bin/update-alternatives-origin \
    && ((test -f /usr/bin/pycompile && mv /usr/bin/pycompile  /usr/bin/pycompile-origin) || true)

COPY commons/update-alternatives  /usr/bin/ 

COPY commons/pycompile  /usr/bin/

# custom maven speedup
COPY custom/build/pom.xml .
COPY custom/build/settings.xml /root/.m2/settings.xml
RUN ["mvn", "dependency:go-offline"]
RUN rm -f pom.xml

RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/
RUN npm config set registry https://registry.npmmirror.com
RUN composer config -g repo.packagist composer https://mirrors.aliyun.com/composer/
RUN pip install --upgrade pip

RUN mv /etc/apt/sources.list /etc/apt/sources.list.bak
COPY commons/debian-stretch-aliyun-sources.list /etc/apt/sources.list

COPY commons/apt-get-install.sh /usr/bin/apt-get-install

WORKDIR /code
