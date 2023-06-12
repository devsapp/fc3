import BaseComponent from './common/base';
import { InputProps } from './common/entity';
export default class ComponentDemo extends BaseComponent {
    constructor(props: any);
    /**
     * OSS 触发器事件
     * @param inputs
     * @returns
     */
    oss(inputs: InputProps): Promise<void>;
    /**
     * SLS 触发器事件
     * @param inputs
     * @returns
     */
    sls(inputs: InputProps): Promise<void>;
    /**
     * http 触发器事件
     * @param inputs
     * @returns
     */
    http(inputs: InputProps): Promise<void>;
    /**
     * TableStore 触发器事件
     * @param inputs
     * @returns
     */
    tablestore(inputs: InputProps): Promise<void>;
    /**
     * MNS 触发器事件
     * @param inputs
     * @returns
     */
    mns(inputs: InputProps): Promise<void>;
    /**
     * CDN 触发器事件
     * @param inputs
     * @returns
     */
    cdn(inputs: InputProps): Promise<void>;
}
