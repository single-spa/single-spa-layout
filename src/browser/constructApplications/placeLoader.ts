import { LifeCycles, mountRootParcel, ParcelConfig } from 'single-spa';
import { applicationElementId, htmlToParcelConfig } from '../../utils/index.js';

const createApplicationElement = (htmlId: string) => {
  const element = document.createElement('div');
  element.id = htmlId;
  element.style.display = 'none';
  document.body.appendChild(element);
  return element;
};

const getOrCreateApplicationElement = (appName: string) => {
  const htmlId = applicationElementId(appName);
  let existedAppElement = document.getElementById(htmlId);
  const applicationElement =
    existedAppElement ?? createApplicationElement(htmlId);

  const makeElementVisible = () => {
    if (!existedAppElement) {
      applicationElement.style.removeProperty('display');
      applicationElement.getAttribute('style') === '' &&
        applicationElement.removeAttribute('style');
    }
    window.removeEventListener(
      'single-spa:before-mount-routing-event',
      makeElementVisible,
    );
  };

  window.addEventListener(
    'single-spa:before-mount-routing-event',
    makeElementVisible,
  );
  return { applicationElement, makeElementVisible };
};

const createParcel = (
  appName: string,
  applicationElement: HTMLElement,
  loader: string | ParcelConfig,
) => {
  const parcelConfig =
    typeof loader === 'string' ? htmlToParcelConfig(loader) : loader;
  return mountRootParcel(parcelConfig, {
    domElement: applicationElement,
    name: `application-loader:${appName}`,
  });
};

export const placeLoader = async (
  appName: string,
  loader: string | ParcelConfig,
  loadingPromise: Promise<LifeCycles>,
) => {
  const { applicationElement, makeElementVisible } =
    getOrCreateApplicationElement(appName);
  const parcel = createParcel(appName, applicationElement, loader);

  try {
    const [_, app] = await Promise.all([parcel.mountPromise, loadingPromise]);
    await parcel.unmount();
    makeElementVisible();
    return app;
  } catch (error) {
    await parcel.unmount();
    makeElementVisible();
    throw error;
  }
};
