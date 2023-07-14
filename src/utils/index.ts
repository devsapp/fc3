export { default as getFcClient } from './fc-client';
export { default as verify } from './verify';

export const sleep = async (timer: number): Promise<void> => await new Promise((resolve) => setTimeout(resolve, timer))
