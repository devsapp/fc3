# Component description

<center><a href="readme.md">中文</a> ｜ English </center>


This component is a component used to assist users in making function calls. It mainly encapsulates the event format of a variety of function calculations.

````

  ┌─────────────────────────────────────────────────────────────────────────────────────┐
  │ Method     │ Method description │ Input parameter example │ Command line calling example │
  ├──────────────────────────────────────────────────────────────────────────────────────┤
  │ http       │ HTTP trigger event │                         │ s cli fc-event http      │
  ├──────────────────────────────────────────────────────────────────────────────────────┤
  │ cdn        │ CDN trigger events │                         │ s cli fc-event cdn       │
  ├──────────────────────────────────────────────────────────────────────────────────────┤
  │ mns        │ MNS trigger event  │                         │ s cli fc-event mns       │
  ├──────────────────────────────────────────────────────────────────────────────────────┤
  │ oss        │ OSS trigger event  │                         │ s cli fc-event oss       │
  ├──────────────────────────────────────────────────────────────────────────────────────┤
  │ sls        │ SLS trigger event  │                         │ s cli fc-event sls       │
  ├──────────────────────────────────────────────────────────────────────────────────────┤
  │ tablestore │ TableStore trigger events │                  │ s cli fc-event tablestore│
  └──────────────────────────────────────────────────────────────────────────────────────┘
````

The usage method is very simple. For example, I want to create an event template of an oss trigger under the current project, just execute:

````
s cli fc-event oss
````

You can see the system reminder:

````

      OSS event template created successfully.
      
      👓 Event Template Path: event-template/oss-event.json
      
      You could user fc/fc-api component invoke method and specify the event.
      E.g: [s projectName invoke --event-file event-template/oss-event.json]
      
      More information about OSS Trigger:
        📝 https://help.aliyun.com/document_detail/74763.htm
      
      
End of method: oss
````

At this point, you can see the file `./event-template/oss-event.json` in the current directory:

````
{
  "events": [
    {
      "eventName": "ObjectCreated:PutObject",
      "eventSource": "acs:oss",
      "eventTime": "2017-04-21T12:46:37.000Z",
      "eventVersion": "1.0",
      "oss": {
        "bucket": {
          "arn": "acs:oss:cn-shanghai:123456789:bucketname",
          "name": "testbucket",
          "ownerIdentity": "123456789",
          "virtualBucket": ""
        },
        "object": {
          "deltaSize": 122539,
          "eTag": "688A7BF4F233DC9C88A80BF985AB7329",
          "key": "image/a.jpg",
          "size": 122539
        },
        "ossSchemaVersion": "1.0",
        "ruleId": "9adac8e253828f4f7c0466d941fa3db81161****"
      },
      "region": "cn-shanghai",
      "requestParameters": {
        "sourceIPAddress": "140.205.***.***"
      },
      "responseElements": {
        "requestId": "58F9FF2D3DF792092E12044C"
      },
      "userIdentity": {
        "principalId": "123456789"
      }
    }
  ]
}
````