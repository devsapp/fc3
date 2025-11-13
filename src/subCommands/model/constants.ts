export const NEW_MODEL_SERVICE_CLIENT_CONNECT_TIMEOUT: number =
  parseInt(process.env.NEW_MODEL_SERVICE_CLIENT_CONNECT_TIMEOUT as string, 10) || 5 * 60 * 1000;
export const NEW_MODEL_SERVICE_CLIENT_READ_TIMEOUT: number =
  parseInt(process.env.NEW_MODEL_SERVICE_CLIENT_READ_TIMEOUT as string, 10) || 5 * 60 * 1000;
export const MODEL_DOWNLOAD_TIMEOUT: number =
  parseInt(process.env.MODEL_DOWNLOAD_TIMEOUT as string, 10) || 40 * 60 * 1000;
