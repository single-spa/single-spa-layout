import { treeAdapter } from "./treeAdapter.js";
import path from "path";
import fs from "fs";
import { validateString } from "../utils/validation-helpers.js";
import { constructRoutes } from "../isomorphic/constructRoutes.js";
import Parser from "./CustomParser.js";

const errPrefix = `single-spa-layout (server):`;

/**
 * @typedef {{
 * html?: string;
 * filePath?: string;
 * }} HTMLTemplateOptions
 *
 * @typedef {{
 * resolvedRoutes: import('../isomorphic/constructRoutes').ResolvedRoutesConfig;
 * parsedDocument: import('parse5').Document;
 * }} ServerLayout
 *
 * @param {HTMLTemplateOptions} templateOptions
 * @returns {ServerLayout}
 */
export function constructServerLayout(templateOptions) {
  if (!templateOptions) {
    throw Error(`${errPrefix} templateOptions is required`);
  }

  let html;
  if (templateOptions.hasOwnProperty("html")) {
    html = templateOptions.html;
    validateString("html", html);
  } else if (templateOptions.hasOwnProperty("filePath")) {
    html = fs
      .readFileSync(
        path.resolve(process.cwd(), templateOptions.filePath),
        "utf-8"
      )
      .toString();
    validateString("filePath", html);
  } else {
    throw Error(
      `${errPrefix} either templateOptions.html or templateOptions.filePath is required`
    );
  }

  let parsedDocument;
  const parser = new Parser();

  try {
    parsedDocument = parser.parse(html);
  } catch (err) {
    console.error(`${errPrefix} failed to parse HTML template with parse5.`);
    throw err;
  }

  const routerElement = findElement(parsedDocument, "single-spa-router");

  const resolvedRoutes = constructRoutes(routerElement);

  let containerEl = resolvedRoutes.containerEl;
  if (typeof containerEl === "string") {
    // TODO - replace with a true querySelector implementation
    containerEl = findElement(parsedDocument, containerEl);
  }

  const routerFragment = treeAdapter.createElement(
    "ssl-router-content",
    null,
    []
  );

  const firstChild = treeAdapter.getFirstChild(containerEl);
  if (firstChild) {
    treeAdapter.insertBefore(containerEl, routerFragment, firstChild);
  } else {
    treeAdapter.appendChild(containerEl, routerFragment);
  }

  return {
    parsedDocument,
    resolvedRoutes,
  };
}

/**
 *
 * @param {import('parse5').Document} parsedHtml
 * @param {string} nodeName
 * @returns {import('parse5').Element}
 */
function findElement(parsedHtml, nodeName) {
  const el = recurseElement(parsedHtml, nodeName);
  if (el) {
    return el;
  } else {
    throw Error(`${errPrefix} could not find ${nodeName} element in HTML`);
  }
}

/**
 *
 * @param {import('parse5').Element} element
 * @param {string} nodeName
 */
function recurseElement(element, nodeName) {
  const tagName = treeAdapter.getTagName(element);
  const children =
    tagName === "template"
      ? treeAdapter.getChildNodes(treeAdapter.getTemplateContent(element))
      : treeAdapter.getChildNodes(element);

  if (tagName === nodeName) {
    return element;
  } else if (children) {
    for (let i = 0; i < children.length; i++) {
      const result = recurseElement(children[i], nodeName);
      if (result) {
        return result;
      }
    }
  }

  return null;
}
