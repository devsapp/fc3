# coding=utf-8
import os

def handler(event, context):
  print(event, "  111111111")
  print(context.credentials.to_dict())
  print(os.environ)
  return event
