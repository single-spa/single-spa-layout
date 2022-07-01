import { ParcelConfig, ParcelProps } from 'single-spa';

interface ExtraProps extends ParcelProps {
  name?: string;
}

export const htmlToParcelConfig = (html: string): ParcelConfig<ExtraProps> => ({
  bootstrap: () => Promise.resolve(),
  mount: props =>
    Promise.resolve().then(() => {
      props.domElement.innerHTML = html;
    }),
  unmount: props =>
    Promise.resolve().then(() => {
      props.domElement.innerHTML = '';
    }),
});
