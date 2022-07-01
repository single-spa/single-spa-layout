import { SingleSpaEventListener } from './types.js';

export const handleBeforeMountRouting = (
  arrangeDomElements: VoidFunction,
): SingleSpaEventListener => arrangeDomElements;
