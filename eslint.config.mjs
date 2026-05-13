import { createRequire } from "module";

const require = createRequire(import.meta.url);
const nextConfig = require("eslint-config-next");

const config = [
  ...nextConfig,
  {
    ignores: [".next/**", "node_modules/**", "out/**"],
  },
  {
    rules: {
      // setState dentro de useEffect é padrão legítimo para estado derivado/inicialização
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
