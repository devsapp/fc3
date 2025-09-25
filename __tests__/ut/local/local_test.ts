import ComponentLocal from '../../../src/subCommands/local';
import logger from '../../../src/logger';
import { IInputs } from '../../../src/interface';

// Mock logger
jest.mock('../../../src/logger', () => {
  const mockLogger = {
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    output: jest.fn(),
    spin: jest.fn(),
    tips: jest.fn(),
    append: jest.fn(),
    tipsOnce: jest.fn(),
    warnOnce: jest.fn(),
    writeOnce: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

// Mock local invoke implementations
jest.mock('../../../src/subCommands/local/impl/invoke/nodejsLocalInvoke', () => {
  return {
    NodejsLocalInvoke: jest.fn().mockImplementation(() => {
      return {
        invoke: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('../../../src/subCommands/local/impl/invoke/pythonLocalInvoke', () => {
  return {
    PythonLocalInvoke: jest.fn().mockImplementation(() => {
      return {
        invoke: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('../../../src/subCommands/local/impl/invoke/javaLocalInvoke', () => {
  return {
    JavaLocalInvoke: jest.fn().mockImplementation(() => {
      return {
        invoke: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('../../../src/subCommands/local/impl/invoke/phpLocalInvoke', () => {
  return {
    PhpLocalInvoke: jest.fn().mockImplementation(() => {
      return {
        invoke: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('../../../src/subCommands/local/impl/invoke/goLocalInvoke', () => {
  return {
    GoLocalInvoke: jest.fn().mockImplementation(() => {
      return {
        invoke: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('../../../src/subCommands/local/impl/invoke/dotnetLocalInvoke', () => {
  return {
    DotnetLocalInvoke: jest.fn().mockImplementation(() => {
      return {
        invoke: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('../../../src/subCommands/local/impl/invoke/customLocalInvoke', () => {
  return {
    CustomLocalInvoke: jest.fn().mockImplementation(() => {
      return {
        invoke: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('../../../src/subCommands/local/impl/invoke/customContainerLocalInvoke', () => {
  return {
    CustomContainerLocalInvoke: jest.fn().mockImplementation(() => {
      return {
        invoke: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

// Mock local start implementations
jest.mock('../../../src/subCommands/local/impl/start/nodejsLocalStart', () => {
  return {
    NodejsLocalStart: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('../../../src/subCommands/local/impl/start/pythonLocalStart', () => {
  return {
    PythonLocalStart: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('../../../src/subCommands/local/impl/start/phpLocalStart', () => {
  return {
    PhpLocalStart: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('../../../src/subCommands/local/impl/start/goLocalInvoke', () => {
  return {
    GoLocalStart: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('../../../src/subCommands/local/impl/start/dotnetLocalStart', () => {
  return {
    DotnetLocalStart: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('../../../src/subCommands/local/impl/start/javaLocalStart', () => {
  return {
    JavaLocalStart: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('../../../src/subCommands/local/impl/start/customLocalStart', () => {
  return {
    CustomLocalStart: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('../../../src/subCommands/local/impl/start/customContainerLocalStart', () => {
  return {
    CustomContainerLocalStart: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe('ComponentLocal', () => {
  let componentLocal: ComponentLocal;
  let mockInputs: IInputs;

  beforeEach(() => {
    componentLocal = new ComponentLocal();
    mockInputs = {
      cwd: '/test',
      baseDir: '/test',
      name: 'test-app',
      props: {
        region: 'cn-hangzhou',
        functionName: 'test-function',
        runtime: 'nodejs18',
        handler: 'index.handler',
        code: './code',
      },
      command: 'local',
      args: [],
      yaml: {
        path: '/test/s.yaml',
      },
      resource: {
        name: 'test-resource',
        component: 'fc3',
        access: 'default',
      },
      outputs: {},
      getCredential: jest.fn().mockResolvedValue({
        AccountID: '123456789',
        AccessKeyID: 'test-key',
        AccessKeySecret: 'test-secret',
        SecurityToken: 'test-token',
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('invoke', () => {
    it('should invoke nodejs function successfully', async () => {
      mockInputs.props.runtime = 'nodejs18';
      const {
        NodejsLocalInvoke,
      } = require('../../../src/subCommands/local/impl/invoke/nodejsLocalInvoke');
      const mockInstance = { invoke: jest.fn().mockResolvedValue(undefined) };
      (NodejsLocalInvoke as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.invoke(mockInputs);

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('invoke input'));
      expect(NodejsLocalInvoke).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.invoke).toHaveBeenCalled();
    });

    it('should invoke python function successfully', async () => {
      mockInputs.props.runtime = 'python3.9';
      const {
        PythonLocalInvoke,
      } = require('../../../src/subCommands/local/impl/invoke/pythonLocalInvoke');
      const mockInstance = { invoke: jest.fn().mockResolvedValue(undefined) };
      (PythonLocalInvoke as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.invoke(mockInputs);

      expect(PythonLocalInvoke).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.invoke).toHaveBeenCalled();
    });

    it('should invoke java function successfully', async () => {
      mockInputs.props.runtime = 'java11';
      const {
        JavaLocalInvoke,
      } = require('../../../src/subCommands/local/impl/invoke/javaLocalInvoke');
      const mockInstance = { invoke: jest.fn().mockResolvedValue(undefined) };
      (JavaLocalInvoke as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.invoke(mockInputs);

      expect(JavaLocalInvoke).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.invoke).toHaveBeenCalled();
    });

    it('should invoke php function successfully', async () => {
      mockInputs.props.runtime = 'php7.2';
      const {
        PhpLocalInvoke,
      } = require('../../../src/subCommands/local/impl/invoke/phpLocalInvoke');
      const mockInstance = { invoke: jest.fn().mockResolvedValue(undefined) };
      (PhpLocalInvoke as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.invoke(mockInputs);

      expect(PhpLocalInvoke).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.invoke).toHaveBeenCalled();
    });

    it('should invoke go function successfully', async () => {
      mockInputs.props.runtime = 'go1';
      const { GoLocalInvoke } = require('../../../src/subCommands/local/impl/invoke/goLocalInvoke');
      const mockInstance = { invoke: jest.fn().mockResolvedValue(undefined) };
      (GoLocalInvoke as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.invoke(mockInputs);

      expect(GoLocalInvoke).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.invoke).toHaveBeenCalled();
    });

    it('should invoke dotnet function successfully', async () => {
      mockInputs.props.runtime = 'dotnetcore3.1';
      const {
        DotnetLocalInvoke,
      } = require('../../../src/subCommands/local/impl/invoke/dotnetLocalInvoke');
      const mockInstance = { invoke: jest.fn().mockResolvedValue(undefined) };
      (DotnetLocalInvoke as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.invoke(mockInputs);

      expect(DotnetLocalInvoke).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.invoke).toHaveBeenCalled();
    });

    it('should invoke custom function successfully', async () => {
      mockInputs.props.runtime = 'custom';
      const {
        CustomLocalInvoke,
      } = require('../../../src/subCommands/local/impl/invoke/customLocalInvoke');
      const mockInstance = { invoke: jest.fn().mockResolvedValue(undefined) };
      (CustomLocalInvoke as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.invoke(mockInputs);

      expect(CustomLocalInvoke).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.invoke).toHaveBeenCalled();
    });

    it('should invoke custom-container function successfully', async () => {
      mockInputs.props.runtime = 'custom-container';
      const {
        CustomContainerLocalInvoke,
      } = require('../../../src/subCommands/local/impl/invoke/customContainerLocalInvoke');
      const mockInstance = { invoke: jest.fn().mockResolvedValue(undefined) };
      (CustomContainerLocalInvoke as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.invoke(mockInputs);

      expect(CustomContainerLocalInvoke).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.invoke).toHaveBeenCalled();
    });

    it('should warn when function has http trigger', async () => {
      mockInputs.props.runtime = 'nodejs18';
      mockInputs.props.triggers = [
        {
          triggerType: 'http',
          triggerName: 'httpTrigger',
          triggerConfig: {
            authType: 'anonymous',
            methods: ['GET'],
          },
        },
      ];

      await componentLocal.invoke(mockInputs);

      expect(logger.warn).toHaveBeenCalledWith(
        'The function has an HTTP trigger. You had better use ‘s local start‘ instead. ',
      );
    });

    it('should log error for unsupported runtime', async () => {
      mockInputs.props.runtime = 'unsupported-runtime' as any;
      await componentLocal.invoke(mockInputs);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('is not supported'));
    });
  });

  describe('start', () => {
    it('should start nodejs function successfully', async () => {
      mockInputs.props.runtime = 'nodejs18';
      mockInputs.props.triggers = [
        {
          triggerType: 'http',
          triggerName: 'httpTrigger',
          triggerConfig: {
            authType: 'anonymous',
            methods: ['GET'],
          },
        },
      ];
      const {
        NodejsLocalStart,
      } = require('../../../src/subCommands/local/impl/start/nodejsLocalStart');
      const mockInstance = { start: jest.fn().mockResolvedValue(undefined) };
      (NodejsLocalStart as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.start(mockInputs);

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('start input'));
      expect(NodejsLocalStart).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.start).toHaveBeenCalled();
    });

    it('should start python function successfully', async () => {
      mockInputs.props.runtime = 'python3.9';
      mockInputs.props.triggers = [
        {
          triggerType: 'http',
          triggerName: 'httpTrigger',
          triggerConfig: {
            authType: 'anonymous',
            methods: ['GET'],
          },
        },
      ];
      const {
        PythonLocalStart,
      } = require('../../../src/subCommands/local/impl/start/pythonLocalStart');
      const mockInstance = { start: jest.fn().mockResolvedValue(undefined) };
      (PythonLocalStart as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.start(mockInputs);

      expect(PythonLocalStart).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.start).toHaveBeenCalled();
    });

    it('should start java function successfully', async () => {
      mockInputs.props.runtime = 'java11';
      mockInputs.props.triggers = [
        {
          triggerType: 'http',
          triggerName: 'httpTrigger',
          triggerConfig: {
            authType: 'anonymous',
            methods: ['GET'],
          },
        },
      ];
      const {
        JavaLocalStart,
      } = require('../../../src/subCommands/local/impl/start/javaLocalStart');
      const mockInstance = { start: jest.fn().mockResolvedValue(undefined) };
      (JavaLocalStart as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.start(mockInputs);

      expect(JavaLocalStart).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.start).toHaveBeenCalled();
    });

    it('should start php function successfully', async () => {
      mockInputs.props.runtime = 'php7.2';
      mockInputs.props.triggers = [
        {
          triggerType: 'http',
          triggerName: 'httpTrigger',
          triggerConfig: {
            authType: 'anonymous',
            methods: ['GET'],
          },
        },
      ];
      const { PhpLocalStart } = require('../../../src/subCommands/local/impl/start/phpLocalStart');
      const mockInstance = { start: jest.fn().mockResolvedValue(undefined) };
      (PhpLocalStart as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.start(mockInputs);

      expect(PhpLocalStart).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.start).toHaveBeenCalled();
    });

    it('should start go function successfully', async () => {
      mockInputs.props.runtime = 'go1';
      mockInputs.props.triggers = [
        {
          triggerType: 'http',
          triggerName: 'httpTrigger',
          triggerConfig: {
            authType: 'anonymous',
            methods: ['GET'],
          },
        },
      ];
      const { GoLocalStart } = require('../../../src/subCommands/local/impl/start/goLocalInvoke');
      const mockInstance = { start: jest.fn().mockResolvedValue(undefined) };
      (GoLocalStart as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.start(mockInputs);

      expect(GoLocalStart).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.start).toHaveBeenCalled();
    });

    it('should start dotnet function successfully', async () => {
      mockInputs.props.runtime = 'dotnetcore3.1';
      mockInputs.props.triggers = [
        {
          triggerType: 'http',
          triggerName: 'httpTrigger',
          triggerConfig: {
            authType: 'anonymous',
            methods: ['GET'],
          },
        },
      ];
      const {
        DotnetLocalStart,
      } = require('../../../src/subCommands/local/impl/start/dotnetLocalStart');
      const mockInstance = { start: jest.fn().mockResolvedValue(undefined) };
      (DotnetLocalStart as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.start(mockInputs);

      expect(DotnetLocalStart).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.start).toHaveBeenCalled();
    });

    it('should start custom function successfully', async () => {
      mockInputs.props.runtime = 'custom';
      mockInputs.props.triggers = [
        {
          triggerType: 'http',
          triggerName: 'httpTrigger',
          triggerConfig: {
            authType: 'anonymous',
            methods: ['GET'],
          },
        },
      ];
      const {
        CustomLocalStart,
      } = require('../../../src/subCommands/local/impl/start/customLocalStart');
      const mockInstance = { start: jest.fn().mockResolvedValue(undefined) };
      (CustomLocalStart as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.start(mockInputs);

      expect(CustomLocalStart).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.start).toHaveBeenCalled();
    });

    it('should start custom-container function successfully', async () => {
      mockInputs.props.runtime = 'custom-container';
      mockInputs.props.triggers = [
        {
          triggerType: 'http',
          triggerName: 'httpTrigger',
          triggerConfig: {
            authType: 'anonymous',
            methods: ['GET'],
          },
        },
      ];
      const {
        CustomContainerLocalStart,
      } = require('../../../src/subCommands/local/impl/start/customContainerLocalStart');
      const mockInstance = { start: jest.fn().mockResolvedValue(undefined) };
      (CustomContainerLocalStart as jest.Mock).mockImplementation(() => mockInstance);

      await componentLocal.start(mockInputs);

      expect(CustomContainerLocalStart).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.start).toHaveBeenCalled();
    });

    it('should log error when function does not have http trigger', async () => {
      mockInputs.props.runtime = 'nodejs18';
      mockInputs.props.triggers = [
        {
          triggerType: 'timer',
          triggerName: 'timerTrigger',
          triggerConfig: {
            cronExpression: '@every 5m',
            enable: true,
          },
        },
      ];

      await componentLocal.start(mockInputs);

      expect(logger.error).toHaveBeenCalledWith(
        'The function does not have an HTTP trigger and cannot use ‘s local start’. You should use ‘s local invoke’ instead.',
      );
    });

    it('should log error for unsupported runtime', async () => {
      mockInputs.props.runtime = 'unsupported-runtime' as any;
      mockInputs.props.triggers = [
        {
          triggerType: 'http',
          triggerName: 'httpTrigger',
          triggerConfig: {
            authType: 'anonymous',
            methods: ['GET'],
          },
        },
      ];

      await componentLocal.start(mockInputs);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('start command'));
    });
  });

  describe('hasHttpTrigger', () => {
    it('should return true when http trigger exists', () => {
      const triggers = [
        {
          triggerType: 'timer',
          triggerName: 'timerTrigger',
          triggerConfig: {
            cronExpression: '@every 5m',
            enable: true,
          },
        },
        {
          triggerType: 'http',
          triggerName: 'httpTrigger',
          triggerConfig: {
            authType: 'anonymous',
            methods: ['GET'],
          },
        },
      ];

      const result = componentLocal.hasHttpTrigger(triggers);
      expect(result).toBe(true);
    });

    it('should return false when no http trigger exists', () => {
      const triggers = [
        {
          triggerType: 'timer',
          triggerName: 'timerTrigger',
          triggerConfig: {
            cronExpression: '@every 5m',
            enable: true,
          },
        },
        {
          triggerType: 'oss',
          triggerName: 'ossTrigger',
          triggerConfig: {
            events: ['oss:ObjectCreated:*'],
            filter: {
              key: {
                prefix: 'source/',
                suffix: '.jpg',
              },
            },
          },
        },
      ];

      const result = componentLocal.hasHttpTrigger(triggers);
      expect(result).toBe(false);
    });

    it('should return false when triggers is not an array', () => {
      const result = componentLocal.hasHttpTrigger(null);
      expect(result).toBe(false);
    });

    it('should return false when triggers array is empty', () => {
      const result = componentLocal.hasHttpTrigger([]);
      expect(result).toBe(false);
    });
  });
});
