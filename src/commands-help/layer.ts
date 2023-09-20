export default {
  help: {
    description: 'Resource layer operation ',
    summary: 'Resource layer operation ',
  },
  subCommands: {
    publish: {
      help: {
        description: `Publish new layer version.
Example:
  $ s3 layer publish --code layer.zip --layer-name testName --compatible-runtime nodejs12
  $ s3 layer publish --code ./layer --layer-name testName --compatible-runtime nodejs12,nodejs10,python3 --description "this is description"`,
        summary: 'Publish new layer version',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc region of the layer, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--layer-name <layerName>', '[Required] Specify the name of the layer'],
          ['--code <code>', '[Required] Specify the code path of the layer'],
          [
            '--compatible-runtime <compatibleRuntime>',
            '[Required] Specify the compatible runtimes of the layer, you can see all compatible runtimes in https://www.alibabacloud.com/help/zh/fc/user-guide/overview-of-runtimes',
          ],
          ['--description <description>', '[Optional] Specify the description of the layer'],
        ],
      },
    },
    list: {
      help: {
        description: `List layers.
Example:
  $ s3 layer list
  $ s3 layer list --prefix test --official --table`,
        summary: 'List layers',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--prefix <prefix>', '[Optional] Specify the prefix of layer name'],
          ['--public', '[Optional] Specify if show personal public layers'],
          [
            '--official',
            '[Optional] Specify if show official public layers. If you set "official" as true, "public" will be automatically set as true, which means setting "public" as false is void',
          ],
          ['--table', '[Optional] Specify if output the result as table format'],
        ],
      },
    },
    info: {
      help: {
        description: `Get layer version detail.
Example:
  $ s3 layer info --layer-name testName --version-id 123`,
        summary: 'Get layer version detail',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc region of the layer, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--layer-name <layernName>', '[Required] Specify the name of the layer'],
          ['--version-id <versionId>', '[Required] Specify the version id of the layer version'],
        ],
      },
    },
    versions: {
      help: {
        description: `Get layer versions.
Example:
  $ s3 layer versions --layer-name testName
  $ s3 layer versions --layer-name testName --table`,
        summary: 'Get layer versions',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc region of the layer, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--layer-name <layerName>', '[Required] Specify the name of the layer version'],
          ['--table', '[Optional] Specify if output the result as table format'],
        ],
      },
    },
    download: {
      help: {
        description: `Download layer version code.
Example:
  $ s3 layer download --layer-name testName --version-id 123`,
        summary: 'Download layer version code',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc region of the layer, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--layer-name <layerName>', '[Required] Specify the name of the layer version.'],
          ['--version-id <versionId>', '[Required] Specify the version id of the layer version.'],
        ],
      },
    },
    acl: {
      help: {
        description: `Set the layer as public or private.
Example:
  $ s3 layer acl --layer-name testName
  $ s3 layer acl --layer-name testName --public`,
        summary: 'Set the layer as public or private',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc region of the layer, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--layer-name <layerName>', '[Required] Specify the name of the layer version'],
          [
            '--public',
            '[Optional] Specify if the layer is public. If you do not use this key, the layer will be set private',
          ],
        ],
      },
    },
    remove: {
      help: {
        description: `Remove layer.
Example:
  $ s3 layer remove --layer-name testName --version-id 123`,
        summary: 'Remove layer',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc region of the layer, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--layer-name <layerName>', '[Required] Specify the name of the layer'],
          [
            '--version-id <versionId>',
            '[Optional] Specify the version id of the layer version, if a version-id is not specified, all versions of this layer will be deleted.',
          ],
          ['-y, --assume-yes', "[Optional] Don't ask, delete directly"],
        ],
      },
    },
  },
};
