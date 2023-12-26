import { isChinaUser } from '@serverless-devs/utils';

const getDockerRegistry = () => {
  if (process.env.FC_DOCKER_REGISTRY) {
    return process.env.FC_DOCKER_REGISTRY;
  }

  if (isChinaUser()) {
    return 'registry.cn-beijing.aliyuncs.com';
  }

  return 'registry.hub.docker.com';
};

export const fcDockerVersion = process.env.FC_DOCKER_VERSION || '3.0.0';

export const fcDockerVersionRegistry = getDockerRegistry();

export const fcDockerNameSpace = 'aliyunfc';

export const fcDockerUseImage = process.env.FC_DOCKER_IMAGE_URL;

export const buildPythonLocalPath = process.env.FC_BUILD_PYTHON_DIR || 'python';
