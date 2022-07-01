import { inBrowser } from '../../utils/index.js';
import { SslElement } from '../types/index.js';

const isDomElement = (element: Element | SslElement): element is Element =>
  inBrowser || (typeof Element !== 'undefined' && element instanceof Element);

export const getAttribute = <TValue extends string = string>(
  element: Element | SslElement,
  attrName: string,
) =>
  isDomElement(element)
    ? (element.getAttribute(attrName) as TValue | null)
    : // watch out, parse5 converts attribute names to lowercase and not as is => https://github.com/inikulin/parse5/issues/116
      (element.attrs.find(attr => attr.name === attrName.toLowerCase())
        ?.value as TValue) ?? null;

export const hasAttribute = (element: Element | SslElement, attrName: string) =>
  isDomElement(element)
    ? element.hasAttribute(attrName)
    : element.attrs.some(attr => attr.name === attrName.toLowerCase());

export const setFromAttribute =
  <TName extends string>(attrName: TName) =>
  <TValue extends string>(element: HTMLElement | SslElement) => {
    const value = getAttribute<TValue>(element, attrName);
    return value ? ({ [attrName]: value } as Record<TName, TValue>) : undefined;
  };

export const setIfHasAttribute = <TName extends string>(
  attrName: TName,
  element: HTMLElement | SslElement,
) =>
  hasAttribute(element, attrName)
    ? ({ [attrName]: true } as Record<TName, true>)
    : undefined;
