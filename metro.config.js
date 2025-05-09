// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("@expo/metro-config");

const config = getDefaultConfig(__dirname);

// Resolver options para manejar problemas de módulos específicos
config.resolver.resolverMainFields = ["browser", "main", "react-native"];
config.resolver.sourceExts = ["jsx", "js", "ts", "tsx", "cjs", "mjs", "json"];

// Configuración de blacklist para evitar conflictos
config.resolver.blockList = [/node_modules\/.*\/node_modules\/idb\/.*/];

// Configuración adicional para asegurar que Metro pueda encontrar todos los módulos
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (target, name) => {
      return name in target
        ? target[name]
        : __dirname + "/node_modules/" + name;
    },
  }
);

module.exports = config;
