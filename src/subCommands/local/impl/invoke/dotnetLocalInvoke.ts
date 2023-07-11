import { BaseLocalInvoke } from './baseLocalInvoke';
import _ from 'lodash';

export class DotnetLocalInvoke extends BaseLocalInvoke {
  getDebugArgs(): string {
    if (_.isFinite(this.getDebugPort())) {
      if (this.getRuntime() === 'dotnetcore2.1') {
        return `DEBUG_OPTIONS=true`;
      }
      // TODO dotnetcore3.1, fc-docker also not support dotnetcore3.1
    }
    return '';
  }

  async generateVscodeDebugConfig(): Promise<string> {
    const codePath = await this.getCodeUri();
    const debugPort = this.getDebugPort();
    const functionName = this.getFunctionName();
    return JSON.stringify(
      {
        version: '0.2.0',
        configurations: [
          {
            name: `fc/${functionName}`,
            type: 'coreclr',
            request: 'attach',
            processName: 'dotnet',
            pipeTransport: {
              pipeProgram: 'sh',
              pipeArgs: [
                '-c',
                `docker exec -i $(docker ps -q -f publish=${debugPort}) \${debuggerCommand}`,
              ],
              debuggerPath: '/vsdbg/vsdbg',
              pipeCwd: '${workspaceFolder}',
            },
            windows: {
              pipeTransport: {
                pipeProgram: 'powershell',
                pipeArgs: [
                  '-c',
                  `docker exec -i $(docker ps -q -f publish=${debugPort}) \${debuggerCommand}`,
                ],
                debuggerPath: '/vsdbg/vsdbg',
                pipeCwd: '${workspaceFolder}',
              },
            },
            sourceFileMap: {
              '/code': codePath,
            },
          },
        ],
      },
      null,
      4,
    );
  }
}
