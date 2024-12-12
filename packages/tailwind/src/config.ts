// A small utility for resolving the actual config being used in this project
import resolveConfig from 'tailwindcss/resolveConfig';

import tailwindConfig from '../../../tailwind.config';

const customTailwindConfig = resolveConfig(tailwindConfig);

export { customTailwindConfig as tailwindConfig };
