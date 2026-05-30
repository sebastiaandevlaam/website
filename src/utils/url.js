export const toHttpsUrl = (url) => url?.startsWith('//') ? `https:${url}` : url;
