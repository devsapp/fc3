# -*- coding: utf-8 -*-
import subprocess
import fc2
from bs4 import BeautifulSoup
import logging
import flask

html_doc = """
<html><head><title>The Dormouse's story</title></head>
<body>
<p class="title"><b>The Dormouse's story</b></p>

<p class="story">Once upon a time there were three little sisters; and their names were
<a href="http://example.com/elsie" class="sister" id="link1">Elsie</a>,
<a href="http://example.com/lacie" class="sister" id="link2">Lacie</a> and
<a href="http://example.com/tillie" class="sister" id="link3">Tillie</a>;
and they lived at the bottom of a well.</p>

<p class="story">...</p>
"""


def isPython3():
    import sys
    if sys.version > '3':
        return True
    return False


def handler(event, context):
    logger = logging.getLogger()
    logger.info(event)
    logger.info(flask.__version__)
    soup = BeautifulSoup(html_doc, 'html.parser')
    print(soup.prettify())
    out_bytes = subprocess.check_output(["jq", "--version"])
    print(out_bytes)
    # if isPython3():
    #     assert out_bytes == b'/code/.s/root/usr/bin/git\n'
    return event
