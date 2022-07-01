import { SslFragment } from '../../isomorphic/index.js';
import { logError } from './logError.js';
import { RenderArgs } from './types.js';

export const renderFragment = (
  { attrs }: SslFragment,
  { bodyStream, renderOptions }: RenderArgs,
) => {
  const fragmentName = attrs?.find(({ name }) => name === 'name')?.value;
  if (!fragmentName) throw Error('<fragment> has unknown name');
  try {
    bodyStream.add(
      renderOptions.renderFragment(fragmentName),
      `Fragment ${fragmentName}`,
    );
  } catch (error) {
    logError(`Fragment ${fragmentName}`, error);
  }
};
