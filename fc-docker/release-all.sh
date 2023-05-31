#!/bin/bash

# TODO: dotnetcore3.1

set -e

runtimes=("java8" "java11" "nodejs6" "nodejs8" "nodejs10" "nodejs12" "nodejs14" "python2.7" "python3.6" "python3.9" "python3.10" "php7.2" "dotnetcore2.1" "go1" "custom" "custom.debian10")

for r in ${runtimes[@]}
do
  echo "build-push $r to acr"
  make build-push RUNTIME=$r TAG=$(head -n 1 LATEST) REGISTRY="registry.cn-beijing.aliyuncs.com" VARIANT=base
  make build-push RUNTIME=$r TAG=$(head -n 1 LATEST) REGISTRY="registry.cn-beijing.aliyuncs.com" VARIANT=build
  make build-push RUNTIME=$r TAG=$(head -n 1 LATEST) REGISTRY="registry.cn-beijing.aliyuncs.com" VARIANT=run
  # make build-push RUNTIME=$r TAG=latest REGISTRY="registry.cn-beijing.aliyuncs.com" VARIANT=base
  # make build-push RUNTIME=$r TAG=latest REGISTRY="registry.cn-beijing.aliyuncs.com" VARIANT=build
  # make build-push RUNTIME=$r TAG=latest REGISTRY="registry.cn-beijing.aliyuncs.com" VARIANT=run
done


for r in ${runtimes[@]}
do
  echo "build-push $r to dockerhub"
  make build-push RUNTIME=$r TAG=$(head -n 1 LATEST) VARIANT=base
  make build-push RUNTIME=$r TAG=$(head -n 1 LATEST) VARIANT=build
  make build-push RUNTIME=$r TAG=$(head -n 1 LATEST) VARIANT=run
  # make build-push RUNTIME=$r TAG=latest VARIANT=base
  # make build-push RUNTIME=$r TAG=latest VARIANT=build
  # make build-push RUNTIME=$r TAG=latest VARIANT=run
done