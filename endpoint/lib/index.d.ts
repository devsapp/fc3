import { InputProps } from './common/entity';
export default class Component {
    /**
     * 设置阿里云函数计算的默认值
     * @param inputs
     * @returns
     */
    set(inputs: InputProps): Promise<any>;
    /**
     * 获取所配置的阿里云函数计算默认值
     * @param inputs
     * @returns
     */
    get(inputs: InputProps): Promise<any>;
    private getConfigFromFile;
    private writeToFile;
    private updateHostsFile;
}
