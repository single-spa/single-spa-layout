import { inBrowser } from './environment.js';

class AssertionError extends Error {
  constructor(name: string, expected: unknown, received: unknown) {
    super(`Invalid ${name}: expected ${expected}, but received ${received}`);
  }
}

export function assertObject(
  name: string,
  value: unknown,
): asserts value is object {
  if (typeof value !== 'object' || Array.isArray(value) || value === null)
    throw new AssertionError(
      name,
      'a plain object',
      Array.isArray(value) ? 'array' : value,
    );
}

export function assertBoolean(
  name: string,
  value: unknown,
): asserts value is boolean {
  if (typeof value !== 'boolean')
    throw new AssertionError(name, 'a boolean', typeof value);
}

type ObjectWithKeys<TKeys extends string> = Record<TKeys, unknown>;

export function validateKeys<TKey extends string>(
  name: string,
  value: object,
  validKeys: readonly TKey[],
  disableWarnings = false,
): asserts value is ObjectWithKeys<TKey> {
  if (disableWarnings) return;

  const keys = Object.keys(value);
  const invalidKeys: string[] = [];
  keys.forEach(key => {
    if (validKeys.indexOf(key as TKey) < 0) invalidKeys.push(key);
  });

  if (invalidKeys.length > 0)
    console.warn(
      new AssertionError(
        name,
        `properties '${validKeys.join(', ')}'`,
        `'${invalidKeys.join(', ')}'`,
      ),
    );
}

export function assertEnum<TValue>(
  name: string,
  value: any,
  allowedValues: readonly TValue[],
): asserts value is TValue {
  if (allowedValues.indexOf(value) < 0)
    throw new AssertionError(name, allowedValues.join(', '), value);
}

export function assertString(
  name: string,
  value: unknown,
  strict = true,
): asserts value is string {
  if (typeof value !== 'string' || (strict && value.trim() === ''))
    throw new AssertionError(
      name,
      `a${strict ? ' non-blank' : ''} string`,
      `'${value}'`,
    );
}

export function assertFullPath(
  name: string,
  value: unknown,
): asserts value is string {
  assertString(name, value);
  // TODO: should check `value.indexOf('/') !== 0` or !value.startsWith('/')?
  if (value.indexOf('/') < 0)
    throw new AssertionError(
      name,
      'an absolute path that starts with /',
      `'${value}'`,
    );
}

export function assertArrayLike(
  name: string,
  value: unknown,
): asserts value is ArrayLike<unknown> {
  if (
    !Array.isArray(value) &&
    (typeof value !== 'object' ||
      value === null ||
      typeof (value as any).length !== 'number')
  )
    throw new AssertionError(name, 'an array', `'${value}'`);
}

export function validateArray<TExtraArgs extends unknown[]>(
  name: string,
  value: unknown,
  callback: (value: unknown, key: string, ...extraArgs: TExtraArgs) => void,
  ...extraArgs: TExtraArgs
) {
  assertArrayLike(name, value);
  for (let i = 0; i < value.length; ++i) {
    callback(value[i], `${name}[${i}]`, ...extraArgs);
  }
}

export function assertContainerEl(
  name: string,
  value: unknown,
): asserts value is HTMLElement | string {
  let hasError = false;

  if (typeof value === 'string') hasError = value.trim() === '';
  else if (inBrowser) hasError = !(value instanceof HTMLElement);
  else hasError = true;

  if (hasError)
    throw new AssertionError(
      name,
      'either non-blank string or HTMLElement',
      `'${value}'`,
    );
}
