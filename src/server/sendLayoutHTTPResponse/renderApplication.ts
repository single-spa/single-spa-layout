import { MISSING_PROP, ResolvedApplication } from '../../isomorphic/index.js';
import {
  applicationElementId,
  appPropsScriptId,
  dataScript,
} from '../../utils/index.js';
import { logError } from './logError.js';
import { MergeStream } from './MergeStream.js';
import { AppToRender, RenderArgs } from './types.js';

const getPropsPromise = async (
  { name: appName, props: configProps = {} }: ResolvedApplication,
  { propPromises, renderOptions: { retrieveProp } }: RenderArgs,
) => {
  const propEntries = await Promise.all(
    Object.keys(configProps).map(async propName => {
      const propValue = configProps[propName];
      const value =
        propValue === MISSING_PROP
          ? (propPromises[propName] ||= Promise.resolve(retrieveProp(propName)))
          : propValue;
      const resolvedValue = await Promise.resolve(value);
      return [propName, resolvedValue] as const;
    }),
  );
  const props = Object.fromEntries(propEntries);
  props['name'] = appName;
  return props;
};

const getAppStreams = (
  appToRender: AppToRender,
  { renderOptions: { renderApplication } }: RenderArgs,
) => {
  const { appName } = appToRender;
  const contentStream = new MergeStream(`[${appName}-contentStream]`);
  const assetStream = new MergeStream(`[${appName}-assetStream]`);
  const propsStream = new MergeStream(`[${appName}-propsStream]`);
  try {
    const { assets = '', content, props } = renderApplication(appToRender);
    assetStream.add(assets, `[${appName}-assets]`);
    contentStream.add(content, `[${appName}-content]`);
    if (props) {
      const propsScriptPromise = Promise.resolve(props).then(p =>
        p ? dataScript(p, appPropsScriptId(appName)) : '',
      );
      propsStream.add(propsScriptPromise, `[${appName}-props]`);
    }
  } catch (error) {
    logError(appName, error);
  }

  return { assetStream, contentStream, propsStream };
};

export const renderApplication = (
  node: ResolvedApplication,
  args: RenderArgs,
) => {
  const {
    assetsStream,
    applicationPropPromises,
    bodyStream,
    dataStream,
    headerPromises,
    renderOptions: { retrieveApplicationHeaders },
  } = args;
  const { name: appName } = node;
  const propsPromise = getPropsPromise(node, args);
  applicationPropPromises[appName] = propsPromise;
  const appToRender = { appName, propsPromise };
  headerPromises[appName] = retrieveApplicationHeaders(appToRender);
  const { assetStream, contentStream, propsStream } = getAppStreams(
    appToRender,
    args,
  );
  assetsStream.add(assetStream);
  dataStream.add(propsStream);
  bodyStream.add(`<div id="${applicationElementId(appName)}">`);
  bodyStream.add(contentStream);
  bodyStream.add(`</div>`);
};
