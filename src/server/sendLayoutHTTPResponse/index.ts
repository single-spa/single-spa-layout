import { MergeStream } from "./MergeStream.js";
import { renderChildNodes } from "./renderChildNodes.js";
import type { AppHeaders, RenderArgs, RenderOptions } from "./types.js";

export * from "./types.js";

const isRedirected = ({
  res,
  serverLayout: {
    resolvedConfig: { redirects },
  },
  urlPath,
}: RenderOptions) => {
  for (const from in redirects) {
    if (urlPath === from) {
      res.writeHead(302, { Location: redirects[from] });
      res.end();
      return true;
    }
  }
  return false;
};

const getHeaders = async ({
  applicationPropPromises,
  headerPromises,
  renderOptions: { assembleFinalHeaders },
}: RenderArgs) => {
  const appHeaders = await Promise.all(
    Object.entries(headerPromises).map<Promise<AppHeaders>>(
      async ([appName, headerPromise]) => {
        const [appHeaders, appProps] = await Promise.all([
          headerPromise,
          applicationPropPromises[appName]!,
        ]);
        return { appHeaders, appProps };
      }
    )
  );
  return assembleFinalHeaders(appHeaders);
};

export const sendLayoutHTTPResponse = async (renderOptions: RenderOptions) => {
  if (isRedirected(renderOptions)) return;
  const {
    serverLayout: { parsedDocument },
  } = renderOptions;
  const args: RenderArgs = {
    applicationPropPromises: {},
    assetsStream: new MergeStream("assetsStream"),
    bodyStream: new MergeStream("bodyStream"),
    headerPromises: {},
    propPromises: {},
    renderOptions,
  };
  renderChildNodes(parsedDocument, args);
  const headers = await getHeaders(args);
  const { res } = renderOptions;
  const { bodyStream } = args;
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  bodyStream.pipe(res);
};
