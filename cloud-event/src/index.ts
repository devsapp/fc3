import logger from './common/logger';

const fse = require('fs-extra');
import path from 'path';
import inquirer from 'inquirer';
import {InputProps} from './common/entity';

logger.setContent("FC-EVENT")
export default class ComponentDemo {
    /**
     * OSS Trigger event
     * @param inputs
     * @returns
     */
    public async oss(inputs: InputProps) {
        await fse.mkdirs('./event-template/');
        const templateData = await fse.readFileSync(path.join(__dirname, '../', 'event-template/oss.json'))
        await fse.writeFileSync(path.join('./event-template/', 'oss-event.json'), templateData);
        logger.success(`

      OSS event template created successfully.
      
      👓 Event Template Path: ${path.join('./event-template/', 'oss-event.json')}
      
      You could user fc component invoke method and specify the event.
      E.g: [s projectName invoke --event-file  ${path.join('./event-template/', 'oss-event.json')}]

      `)
    }

    /**
     * SLS Trigger event
     * @param inputs
     * @returns
     */
    public async sls(inputs: InputProps) {
        await fse.mkdirs('./event-template/');
        const templateData = await fse.readFileSync(path.join(__dirname, '../', 'event-template/sls.json'))
        await fse.writeFileSync(path.join('./event-template/', 'sls-event.json'), templateData);
        logger.success(`

      SLS event template created successfully.
      
      👓 Event Template Path: ${path.join('./event-template/', 'sls-event.json')}
      
      You could user fc component invoke method and specify the event.
      E.g: [s projectName invoke --event-file  ${path.join('./event-template/', 'sls-event.json')}]

      `)
    }

    /**
     * http Trigger event
     * @param inputs
     * @returns
     */
     public async http(inputs: InputProps) {
        await fse.mkdirs('./event-template/');
        const templateData = await fse.readFileSync(path.join(__dirname, '../', 'event-template/http.json'))
        await fse.writeFileSync(path.join('./event-template/', 'http-parameter.json'), templateData);
        logger.success(`

      HTTP parameter template created successfully.
      
      👓 Parameter Template Path: ${path.join('./event-template/', 'http-parameter.json')}
      
      You could user fc component invoke method and specify the event.
      E.g: [s projectName invoke --event-file  ${path.join('./event-template/', 'http-parameter.json')}]

      `)
    }

    /**
     * TableStore Trigger event
     * @param inputs
     * @returns
     */
    public async tablestore(inputs: InputProps) {
        await fse.mkdirs('./event-template/');
        const templateData = await fse.readFileSync(path.join(__dirname, '../', 'event-template/tablestore.json'))
        await fse.writeFileSync(path.join('./event-template/', 'tablestore-event.json'), templateData);
        logger.success(`

      TableStore event template created successfully.
      
      👓 Event Template Path: ${path.join('./event-template/', 'tablestore-event.json')}
      
      You could user fc component invoke method and specify the event.
      E.g: [s projectName invoke --event-file  ${path.join('./event-template/', 'tablestore-event.json')}]

      `)
    }

    /**
     * MNS Trigger event
     * @param inputs
     * @returns
     */
    public async mns(inputs: InputProps) {
        await fse.mkdirs('./event-template/');

        const cicdPlatform: any = await inquirer.prompt([{
            type: 'list',
            name: 'platform',
            'message': 'Please select MNS event type',
            choices: [
                {name: 'When the event format is set to STREAM, the message does not contain message attributes (MessageAttributes)', value: '0'},
                {name: 'When the event format is set to STREAM and the message contains message attributes (MessageAttributes)', value: '1'},
                {name: 'When the event format is set to JSON and the message does not contain message attributes (MessageAttributes)', value: '2'},
                {name: 'When the event format is set to JSON and the message contains message attributes (MessageAttributes)', value: '3'},
            ]
        }]);
        let templateData
        let targetFile
        switch (cicdPlatform.platform) {
            case '0':
                templateData = 'hello topic'
                targetFile = 'mns-stream-without-message-attributes.json'
                await fse.writeFileSync(path.join('./event-template/', targetFile), templateData);
                break;
            case '1':
                templateData = await fse.readFileSync(path.join(__dirname, '../', 'event-template/mns-stream.json'))
                targetFile = 'mns-stream-with-message-attributes.json'
                await fse.writeFileSync(path.join('./event-template/', targetFile), templateData);
                break;
            case '2':
                templateData = await fse.readFileSync(path.join(__dirname, '../', 'event-template/mns-without-MessageAttributes.json'))
                targetFile = 'mns-json-without-message-attributes.json'
                await fse.writeFileSync(path.join('./event-template/', targetFile), templateData);
                break;
            case '3':
                templateData = await fse.readFileSync(path.join(__dirname, '../', 'event-template/mns-with-MessageAttributes.json.json'))
                targetFile = 'mns-json-with-message-attributes.json'
                await fse.writeFileSync(path.join('./event-template/', targetFile), templateData);
                break;
            default:
                break;
        }

        logger.success(`

      MNS event template created successfully.
      
      👓 Event Template Path: ${path.join('./event-template/', targetFile)}
      
      You could user fc component invoke method and specify the event.
      E.g: [s projectName invoke --event-file  ${path.join('./event-template/', targetFile)}]
      `)
    }

    /**
     * CDN Trigger event
     * @param inputs
     * @returns
     */
    public async cdn(inputs: InputProps) {
        await fse.mkdirs('./event-template/');

        const cicdPlatform: any = await inquirer.prompt([{
            type: 'list',
            name: 'platform',
            'message': 'Please select an CDN event type',
            choices: [
                {name: 'LogFileCreated', value: '0'},
                {name: 'CachedObjectsRefreshed', value: '1'},
                {name: 'CachedObjectsPushed', value: '2'},
                {name: 'CachedObjectsBlocked', value: '3'},
                {name: 'CdnDomainStarted', value: '4'},
                {name: 'CdnDomainStopped', value: '5'},
                {name: 'CdnDomainAdded', value: '6'},
                {name: 'CdnDomainDeleted', value: '7'}
            ]
        }]);
        let templateData
        let targetFile
        switch (cicdPlatform.platform) {
            case '0':
                templateData = await fse.readFileSync(path.join(__dirname, '../', 'event-template/cdn-LogFileCreated.json'))
                targetFile = 'cdn-LogFileCreated.json'
                await fse.writeFileSync(path.join('./event-template/', targetFile), templateData);
                break;
            case '1':
                templateData = await fse.readFileSync(path.join(__dirname, '../', 'event-template/cdn-CachedObjectsRefreshed.json'))
                targetFile = 'cdn-CachedObjectsRefreshed.json'
                await fse.writeFileSync(path.join('./event-template/', targetFile), templateData);
                break;
            case '2':
                templateData = await fse.readFileSync(path.join(__dirname, '../', 'event-template/cdn-CachedObjectsRefreshed.json'))
                targetFile = 'cdn-CachedObjectsPushed.json'
                await fse.writeFileSync(path.join('./event-template/', targetFile), templateData);
                break;
            case '3':
                templateData = await fse.readFileSync(path.join(__dirname, '../', 'event-template/cdn-CachedObjectsRefreshed.json'))
                targetFile = 'cdn-CachedObjectsBlocked.json'
                await fse.writeFileSync(path.join('./event-template/', targetFile), templateData);
                break;
            case '4':
                templateData = await fse.readFileSync(path.join(__dirname, '../', 'event-template/cdn-CdnDomainStarted.json'))
                targetFile = 'cdn-CdnDomainStarted.json'
                await fse.writeFileSync(path.join('./event-template/', targetFile), templateData);
                break;
            case '5':
                templateData = await fse.readFileSync(path.join(__dirname, '../', 'event-template/cdn-CdnDomainStarted.json'))
                targetFile = 'cdn-CdnDomainStopped.json'
                await fse.writeFileSync(path.join('./event-template/', targetFile), templateData);
                break;
            case '6':
                templateData = await fse.readFileSync(path.join(__dirname, '../', 'event-template/cdn-CdnDomainAdded.json'))
                targetFile = 'cdn-CdnDomainAdded.json'
                await fse.writeFileSync(path.join('./event-template/', targetFile), templateData);
                break;
            case '7':
                templateData = await fse.readFileSync(path.join(__dirname, '../', 'event-template/cdn-CdnDomainAdded.json'))
                targetFile = 'cdn-CdnDomainDeleted.json'
                await fse.writeFileSync(path.join('./event-template/', targetFile), templateData);
                break;
            default:
                break;
        }

        logger.success(`

      CDN event template created successfully.
      
      👓 Event Template Path: ${path.join('./event-template/', targetFile)}
      
      You could user fc component invoke method and specify the event.
      E.g: [s projectName invoke --event-file  ${path.join('./event-template/', targetFile)}]
      
      `)
    }

}
