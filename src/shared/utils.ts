/**
 * Convert a local file path to a local-file:// URL that Electron can serve.
 * Handles Windows backslashes → forward slashes.
 *
 * Example: C:\Users\foo\bar.jpg → local-file:///C:/Users/foo/bar.jpg
 */
export function localFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  return `local-file:///${normalized}`;
}
