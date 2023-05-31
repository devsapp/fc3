ARG TAG="latest"
FROM aliyunfc/runtime-java11:${TAG}
ENV DEBIAN_FRONTEND=noninteractive

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

# Copy all files to home directory.
COPY java11/build/pom.xml .
COPY java11/build/settings.xml /root/.m2/settings.xml

#download all the dependencies
RUN ["mvn", "clean", "install"]
RUN ["mvn", "dependency:go-offline"]
RUN rm -f pom.xml

WORKDIR /root
COPY ./java11/build/java11-example /root/java11-example
WORKDIR /root/java11-example
RUN ["mvn", "clean", "package"]
WORKDIR /root
RUN rm -rf java11-example


RUN mv /etc/apt/sources.list /etc/apt/sources.list.bak
COPY commons/debian-stretch-aliyun-sources.list /etc/apt/sources.list

COPY commons/apt-get-install.sh /usr/bin/apt-get-install

WORKDIR /code
