const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const normalized =
    moduleName.endsWith('.ts') && !moduleName.endsWith('.d.ts')
      ? moduleName.slice(0, -3)
      : moduleName;

  if (originalResolveRequest) {
    return originalResolveRequest(context, normalized, platform);
  }

  return context.resolveRequest(context, normalized, platform);
};

module.exports = config;
