import { SslRouterContent } from '../../isomorphic/index.js';
import {
  dataScript,
  layoutConfigScriptId,
  layoutDataScriptId,
} from '../../utils/index.js';
import { logError } from './logError.js';
import { RenderArgs } from './types.js';

const getLayoutData = async (
  propPromises: Record<string, Promise<unknown>>,
) => {
  const propsEntries = await Promise.all(
    Object.entries(propPromises).map(([propName, propValuePromise]) =>
      propValuePromise.then(propValue => [propName, propValue] as const),
    ),
  );
  const props = Object.fromEntries(propsEntries);
  return dataScript(props, layoutDataScriptId);
};

export const renderLayoutData = (
  _: SslRouterContent,
  {
    dataStream,
    renderOptions: {
      serverLayout: { resolvedConfig },
    },
    propPromises,
  }: RenderArgs,
) => {
  try {
    dataStream.add(getLayoutData(propPromises), 'Layout data props');
    dataStream.add(
      dataScript(resolvedConfig, layoutConfigScriptId),
      'Layout data config',
    );
  } catch (error) {
    logError('Stream layout data', error);
  }
};
