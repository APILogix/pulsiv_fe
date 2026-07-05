/** Internal: entry used to emit src/styles/themes.css. Not bundled in the app. */
import { generateThemesCss } from './css-variables';
import { THEMES } from './constants';

export const css = generateThemesCss(THEMES);
