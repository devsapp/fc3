import http from 'http';
import fs from 'fs';
import { promisify } from 'util';
import logger from '../../../logger';

export function getTimeZone(): string {
  const timeZone = `UTC+${0 - new Date().getTimezoneOffset() / 60}`;
  return timeZone;
}

export function formatJsonString(str: string): string {
  try {
    const jsonObj = JSON.parse(str);
    const formattedStr = JSON.stringify(jsonObj, null, 0);
    return formattedStr;
  } catch (e) {
    return str;
  }
}

export async function downloadFile(url: string, filename: string) {
  try {
    const file = fs.createWriteStream(filename);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pipeline = promisify(require('stream').pipeline);
    const response = await http.get(url);
    await pipeline(response, file);
    logger.info(`${url}  ==>   ${filename} has been downloaded.`);
  } catch (err) {
    logger.error(`Error downloading file: ${err}`);
  }
}
