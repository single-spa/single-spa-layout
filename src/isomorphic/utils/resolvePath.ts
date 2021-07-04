export function resolvePath(prefix: string, path: string): string {
  let result: string;

  if (prefix[prefix.length - 1] === "/") {
    if (path[0] === "/") {
      result = prefix + path.slice(1);
    } else {
      result = prefix + path;
    }
  } else if (path[0] === "/") {
    result = prefix + path;
  } else {
    result = prefix + "/" + path;
  }

  if (result.length > 1 && result[result.length - 1] === "/") {
    result = result.slice(0, result.length - 1);
  }

  return result;
}
