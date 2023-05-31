#!/bin/bash

set -e

if [ ! -d "/tmp/install" ]
then
  mkdir -p /tmp/install/root
else
  rm -rf /tmp/install
  mkdir -p /tmp/install/root
fi

if [ ! -d "/code/apt-archives" ]
then
  mkdir -p /code/apt-archives
else
  rm -rf /code/apt-archives
  mkdir -p /code/apt-archives
fi


apt-get update && apt-get install -y -d -o=dir::cache=/tmp/install $* --reinstall --no-install-recommends

for f in $(ls /tmp/install/archives/*.deb); do \
  echo "Preparing to unpack ${f##*/}"; \
  cd /tmp/install/archives; \
  dpkg-deb -x ${f##*/} /code/apt-archives; \
done;