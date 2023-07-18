import logger from '../logger';

/**
 * 处理自定义 endpoint
 * @returns
 */
export const getCustomEndpoint = (): { host?: string; endpoint?: string; protocol?: string } => {
  const CUSTOM_ENDPOINT = process.env.FC_CLIENT_CUSTOM_ENDPOINT;
  logger.debug(`get custom endpoint: ${CUSTOM_ENDPOINT}`);

  if (!CUSTOM_ENDPOINT) {
    return {};
  }

  if (CUSTOM_ENDPOINT.startsWith('http://')) {
    return {
      protocol: 'http',
      host: CUSTOM_ENDPOINT.replace('http://', ''),
      endpoint: CUSTOM_ENDPOINT,
    };
  }

  if (CUSTOM_ENDPOINT.startsWith('https://')) {
    return {
      protocol: 'https',
      host: CUSTOM_ENDPOINT.replace('https://', ''),
      endpoint: CUSTOM_ENDPOINT,
    };
  }

  return {
    protocol: 'https',
    host: CUSTOM_ENDPOINT,
    endpoint: `https://${CUSTOM_ENDPOINT}`,
  };
};

export const FC_CLIENT_DEFAULT_TIMEOUT: number =
  parseInt(process.env.FC_CLIENT_DEFAULT_TIMEOUT || '600') * 1000;
