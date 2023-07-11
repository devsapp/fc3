import Logger from "./logger";

export default class Base {
  commands: any;

  constructor({ logger }) {
    Logger._set(logger);

    this.commands = {
      deploy: {
        help: {
          description: 'deploy command',
          summary: '',
          option: [
            ['--no-enable', 'whether to no enable proxy'],
            ['--abc', 'xxxx'],
          ],
        },
        subCommands: {
          service: { },
          function: { },
        },
      },
      remove: { },
    }
  }
}
