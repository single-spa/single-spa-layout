export const logError = (name: string, err: unknown) => {
  console.error(`${name}: failed to render.`);
  console.error(err);
};
