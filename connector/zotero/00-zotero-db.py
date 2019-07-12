#!/usr/bin/python

from   pprint import pprint
import os
import sqlite3
import sys
import time

DBPATH = '/home/lhl/Zotero/zotero.sqlite'

# https://stackoverflow.com/questions/3300464/how-can-i-get-dict-from-sqlite-query
def dict_factory(cursor, row):
  d = {}
  for idx, col in enumerate(cursor.description):
    d[col[0]] = row[idx]
  return d

# https://stackoverflow.com/questions/10205744/opening-sqlite3-database-from-python-in-read-only-mode
# See also: https://github.com/rogerbinns/apsw
db = sqlite3.connect('file:{}?mode=ro'.format(DBPATH), uri=True)
c = db.cursor()
c.row_factory = dict_factory


# Count Number of Items in DB
sql = '''
 SELECT COUNT(*) AS count FROM items
'''
c.execute(sql)

pprint(c.fetchone())
