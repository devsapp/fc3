export function formatJsonString(str: string): string {
  try {
    const jsonObj = JSON.parse(str);
    const formattedStr = JSON.stringify(jsonObj, null, 0);
    return formattedStr;
  } catch (e) {
    return str;
  }
}
