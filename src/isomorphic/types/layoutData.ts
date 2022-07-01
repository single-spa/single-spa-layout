import { ParcelConfig } from 'single-spa';

export interface HTMLLayoutData {
  errors?: Record<string, string | ParcelConfig>;
  loaders?: Record<string, any>;
  props?: Record<string, any>;
}
