export function htmlToParcelConfig(str) {
  return {
    bootstrap: () => Promise.resolve(),
    mount: (props) =>
      Promise.resolve().then(() => {
        props.domElement.innerHTML = str;
      }),
    unmount: (props) =>
      Promise.resolve().then(() => {
        props.domElement.innerHTML = "";
      }),
  };
}
