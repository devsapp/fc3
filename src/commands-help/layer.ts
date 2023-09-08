export default {
  help: {
    description: 'Resource layer operation ',
    summary: 'Resource layer operation ',
  },
  subCommands: {
    publish: {
      help: {
        description: 'Publish new layer version',
        summary: 'Publish new layer version',
        option: [
          ['--region <region>', '[C-Required] Specify the fc regions of the layer, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability'],
          ['--code <code>', '[Required] Specify the code path of the layer'],
          ['--compatible-runtime <compatibleRuntime>', '[Optional] Specify the compatible runtimes of the layer, you can see all compatible runtimes in https://www.alibabacloud.com/help/en/fc/user-guide/overview-of-runtimes'],
          ['--description <description>', '[Optional] Specify the description of the layer'],
          ['--layer-name <layerName>', '[Required] Specify the name of the layer'],
        ],
      },
    },
    list: {
      help: {
        description: 'Get layer list',
        summary: 'Get layer list',
        option: [
          ['--region <region>', '[C-Required] Specify the fc regions, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability'],
          ['--prefix <prefix>', '[Optional] Specify the prefix of layer name'],
          ['--public <public>', '[Optional] Specify if show personal public layers'],
          ['--official <official>', '[Optional] Specify if show official public layers. If you set "official" as true, "public" will be automatically set as true, which means setting "public" as false is void'],
          ['--table <table>', '[Optional] Specify if output the result as table format'],
        ],
      },
    },
    info: {
      help: {
        description: 'Get layer version detail',
        summary: 'Get layer version detail',
        option: [
          ['--region <region>', '[C-Required] Specify the fc regions of the layer, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability'],
          ['--layer-name <layernName>', '[Required] Specify the name of the layer'],
          ['--version-id <versionId>', '[Required] Specify the version id of the layer version'],
        ],
      },
    },
    versions: {
      help: {
        description: 'Get layer versions ',
        summary: 'Get layer versions ',
        option: [
          ['--region <region>', '[C-Required] Specify the fc regions of the layer, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability'],
          ['--layer-name <layerName>', '[Required] Specify the name of the layer version'],
          ['--table <table>', '[Optional] Specify if output the result as table format'],
        ],
      },
    },
    download: {
      help: {
        description: 'Download layer version code',
        summary: 'Download layer version code',
        option: [
          ['--region <region>', '[C-Required] Specify the fc regions of the layer, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability'],
          ['--layer-name <layerName>', '[Optional] Specify the name of the layer version. If you do not set "arn", "layer-name" is required.'],
          ['--version-id <versionId>', '[Optional] Specify the version id of the layer version. If you do not set "arn", "version-id" is required.'],
          ['--arn <arn>', '[Optional] Specify the ARN (Aliyun Resource Name) of the layer version'],
        ],
      },
    },
    acl: {
      help: {
        description: 'Set the layer as publish or private',
        summary: 'Set the layer as publish or private',
        option: [
          ['--region <region>', '[C-Required] Specify the fc regions of the layer, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability'],
          ['--layer-name <layerName>', '[Required] Specify the name of the layer version'],
          ['--public <public>', '[Optional] Specify if the layer is public. If you do not use this key, the layer will be set private'],
        ],
      },
    },
    remove: {
      help: {
        description: 'Remove layer version',
        summary: 'Remove layer version',
        option: [
          ['--region <region>', '[C-Required] Specify the fc regions of the layer, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability'],
          ['--layer-name <layerName>', '[Required] Specify the name of the layer'],
          ['--version-id <versionId>', '[Required] Specify the version id of the layer version'],
        ],
      },
    },
  },
};
