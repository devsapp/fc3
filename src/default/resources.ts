const defaultName = 'Alibaba-Fc-V3-Component-Generated';
export const VPC_AND_NAS_NAME = process.env.FC_GENERATE_VPC_AND_NAS_NAME || defaultName;

const defaultLogStoreName = 'default-logs';
export const PROJECT = process.env.FC_GENERATE_PROJECT_NAME;
export const LOG_STORE = process.env.FC_GENERATE_LOGSTORE_NAME || defaultLogStoreName;

export function getEnvVariable(key: string): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || '';
  }
  return '';
}
