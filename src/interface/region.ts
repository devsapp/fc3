enum Region {
  'cn-hangzhou' = 'cn-hangzhou',
  'cn-shanghai' = 'cn-shanghai',
  'cn-qingdao' = 'cn-qingdao',
  'cn-beijing' = 'cn-beijing',
  'cn-zhangjiakou' = 'cn-zhangjiakou',
  'cn-huhehaote' = 'cn-huhehaote',
  'cn-shenzhen' = 'cn-shenzhen',
  'ap-northeast-2' = 'ap-northeast-2',
  'cn-chengdu' = 'cn-chengdu',
  'cn-hongkong' = 'cn-hongkong',
  'ap-southeast-1' = 'ap-southeast-1',
  'ap-southeast-2' = 'ap-southeast-2',
  'ap-southeast-3' = 'ap-southeast-3',
  'ap-southeast-5' = 'ap-southeast-5',
  'ap-southeast-7' = 'ap-southeast-7',
  'ap-northeast-1' = 'ap-northeast-1',
  'eu-central-1' = 'eu-central-1',
  'eu-west-1' = 'eu-west-1',
  'us-east-1' = 'us-east-1',
  'us-west-1' = 'us-west-1',
  'ap-south-1' = 'ap-south-1',
}

export type IRegion = `${Region}`;

export const RegionList = Object.values(Region) as string[];

export function checkRegion(r: IRegion): boolean {
  if (!r) {
    throw new Error('Region not specified, please specify --region');
  }
  if (!RegionList.includes(r)) {
    throw new Error(`Invalid region, The allowed regions are ${RegionList}`);
  }
  return true;
}
