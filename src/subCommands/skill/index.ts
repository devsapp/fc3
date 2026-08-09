import _ from 'lodash';
import { parseArgv } from '@serverless-devs/utils';
import logger from '../../logger';
import commandsHelp from '../../commands-help/skill';
import { ALL_TOOLS } from './constants';
import { InstallMode, InstallResult, installOne, resolveSkillSource } from './installer';

const commandsList = Object.keys(commandsHelp.subCommands);

export default class Skill {
  readonly subCommand: InstallMode;
  private tools: string[];
  private scopes: Array<'global' | 'project'>;
  private force: boolean;

  constructor(inputs: { args?: string[] }) {
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h' },
      boolean: ['help', 'global', 'project', 'force'],
      string: ['tools'],
    });
    logger.debug(`skill opts: ${JSON.stringify(opts)}`);

    const subCommand = _.get(opts, '_[0]');
    if (!subCommand || !commandsList.includes(subCommand)) {
      throw new Error(
        `Command "${subCommand}" not found, Please use "s cli fc3 skill -h" to query how to use the command`,
      );
    }
    this.subCommand = subCommand as InstallMode;

    this.tools = this.parseTools(opts.tools);
    this.scopes = this.parseScopes(!!opts.global, !!opts.project);
    // `update` implies overwrite; `force` only affects `install`.
    this.force = !!opts.force;
  }

  async install(): Promise<InstallResult[]> {
    return this.run('install');
  }

  async update(): Promise<InstallResult[]> {
    return this.run('update');
  }

  private parseTools(raw?: string): string[] {
    if (_.isEmpty(raw)) {
      return [...ALL_TOOLS];
    }
    const requested = raw
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const unknown = requested.filter((t) => !ALL_TOOLS.includes(t));
    if (unknown.length > 0) {
      throw new Error(`Unknown tool(s): ${unknown.join(', ')}. Supported: ${ALL_TOOLS.join(', ')}`);
    }
    return _.uniq(requested);
  }

  private parseScopes(global: boolean, project: boolean): Array<'global' | 'project'> {
    if (global && project) {
      return ['global', 'project'];
    }
    if (project) {
      return ['project'];
    }
    // Default to global when nothing (or only --global) is specified.
    return ['global'];
  }

  private run(mode: InstallMode): InstallResult[] {
    const source = resolveSkillSource();
    logger.debug(`skill source: ${source}`);

    const results: InstallResult[] = [];
    for (const scope of this.scopes) {
      for (const tool of this.tools) {
        const result = installOne(source, tool, scope, mode, this.force);
        results.push(result);
        this.logResult(result);
      }
    }
    this.logSummary(mode, results);
    return results;
  }

  private logResult(result: InstallResult): void {
    const label = `${result.tool} (${result.scope})`;
    if (result.status === 'skipped') {
      logger.info(
        `- ${label}: skipped, already installed at ${result.target} (use update or --force)`,
      );
    } else {
      logger.info(`✔ ${label}: ${result.status} → ${result.target}`);
    }
  }

  private logSummary(mode: InstallMode, results: InstallResult[]): void {
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const changed = results.length - skipped;
    logger.info(`skill ${mode} done: ${changed} written, ${skipped} skipped`);
  }
}
