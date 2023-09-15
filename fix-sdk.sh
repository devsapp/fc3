#!/bin/bash
set -e 
set -v

wget  http://images.devsapp.cn/tea-util/src/client.ts -O ./node_modules/@alicloud/tea-util/src/client.ts
wget  http://images.devsapp.cn/tea-util/dist/client.js -O ./node_modules/@alicloud/tea-util/dist/client.js
wget  http://images.devsapp.cn/tea-util/dist/client.d.ts -O ./node_modules/@alicloud/tea-util/dist/client.d.ts
wget  http://images.devsapp.cn/tea-util/dist/client.js.map -O ./node_modules/@alicloud/tea-util/dist/client.js.map