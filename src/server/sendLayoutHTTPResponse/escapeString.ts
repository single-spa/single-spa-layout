const AMP_REGEX = /&/g;
const NBSP_REGEX = /\u00a0/g;
const DOUBLE_QUOTE_REGEX = /"/g;
const LT_REGEX = /</g;
const GT_REGEX = />/g;

export const escapeString = (str: string, attrMode = false) => {
  let result = str.replace(AMP_REGEX, '&amp;').replace(NBSP_REGEX, '&nbsp;');
  result = attrMode
    ? result.replace(DOUBLE_QUOTE_REGEX, '&quot;')
    : result.replace(LT_REGEX, '&lt;').replace(GT_REGEX, '&gt;');
  return result;
};
