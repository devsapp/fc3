# -*- coding: utf-8 -*-

import logging
import os


def handler(event, context):
    filename = "/mnt/auto/test.txt"
    if os.path.exists(filename):
        with open(filename, "r") as file:
            content = file.read()
            return "read:{}".format(content)
    else:
        with open(filename, "w") as file:
            file.write("hello world")
        with open(filename, "r") as file:
            content = file.read()
            return "write:{}".format(content)
