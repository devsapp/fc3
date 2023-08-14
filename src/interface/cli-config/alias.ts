export interface IAlias {
  aliasName: string;
  versionId: string;
  description?: string;
  additionalVersionWeight?: Record<string, number>; // e.g.: {"2":0.05}  版本二占比 5% 灰度
  // routePolicy?: IAliasRoutePolicy;
}

/*
e.g.: 
{
  "condition": "OR",
  "policyItems": [
    {
      "type": "Param",
      "key": "xxx",
      "value": "xxxxx",
      "operator": "="
    },
    {
      "type": "Cookie",
      "key": "????",
      "value": "xxxx",
      "operator": ">="
    },
    {
      "type": "Header",
      "key": "xxxx",
      "value": "asasd",
      "operator": "="
    }
  ]
}
*/
// export interface IAliasRoutePolicy {
//   condition: 'AND' | 'OR';
//   policyItems: IAliasRoutePolicyItem[];
// }

// export interface IAliasRoutePolicyItem {
//   type: 'Param' | 'Cookie' | 'Header';
//   key: string;
//   value: string;
//   operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'percent';
// }
