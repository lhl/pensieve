#!/usr/bin/python

import datetime
import glob
import json
import os
import sys

comments = []
for l in glob.glob('comments/*.json'):
  if os.path.isfile(l):
    with open(l) as f:
      c = json.load(f)
      comments.append([c['permalink'], c['created_utc']])

comments = sorted(comments, key=lambda x:x[1])

comment = comments[0]
date = datetime.datetime.utcfromtimestamp(comment[1]).replace(tzinfo=datetime.timezone.utc)
print('OLDEST:', date, 'https://reddit.com'+comment[0])

comment = comments[-1]
date = datetime.datetime.utcfromtimestamp(comment[1]).replace(tzinfo=datetime.timezone.utc)
print('NEWEST:', date, 'https://reddit.com'+comment[0])

