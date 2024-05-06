# -*- coding: utf-8 -*-

import logging
import os
from flask import Flask
import pandas
import pycurl

def handler(event, context):
    logger = logging.getLogger()
    logger.info(event)
    return event
