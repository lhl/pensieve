#!/usr/bin/env python


import os
from   PyQt5 import QtCore
import sys
import subprocess
import time
import tornado.ioloop
import tornado.web


# Change if necessary
PORT = 11111

###
# if qt config
# else look up local config file
#
###

'''
Pensieve App 
- load up config for repo name when app loads
- handler to update config

- pages vs json


/ - Home; Redirects to Pages
/page/[id]

/image/
/file/


/api/v1/config
/api/v1/nav
/api/v1/page
/api/v1/page/[id]




'''


class Pensieve(tornado.web.Application):
  def __init__(self):
    # Load Config
    self.config = QtCore.QSettings('pensieve', 'tornado')
    try:
      self.repo = self.config.value('repo')
    except:
      self.repo = None
    try:
      self.page = self.config.value('page')
    except:
      self.page = None


    handlers = [
      (r'/', HomeHandler),
      (r'/page(/?.*)', PageHandler),
      (r'/setup', SetupHandler),

      (r'/api/v1/config', APIConfigHandler),
      (r'/api/v1/nav', APINavHandler),
      (r'/api/v1/page(/?.*)', APIPageHandler),
    ]

    settings = {
      'static_path': os.path.join(os.path.dirname(__file__), 'static'),
      'template_path': os.path.join(os.path.dirname(__file__), 'templates'),
      'cookie_secret': '69ad8901a5a79a5baf211ab5814e2ee5c689eef6',
      'debug': True
    }

    tornado.web.Application.__init__(self, handlers, **settings)


class BaseHandler(tornado.web.RequestHandler):
  pass


class APIBaseHandler(BaseHandler):
  pass


class HomeHandler(BaseHandler):
  def get(self):
    if not self.application.repo:
      self.redirect('/setup')
      return
   
    pass
    # Load pages.json from config['repo']
    # Redirect to /page/[last-page]
    # else if no page, redirect to /page (empty, create)


class PageHandler(BaseHandler):
  def get(self):
    pass


class SetupHandler(BaseHandler):
  def get(self):
    self.render('setup.html')
    pass

  def post(self):
    # Write Repo
    repo = self.get_argument('repo', None)
    if repo:
      self.application.config.setValue('repo', repo)
      self.application.repo = self.application.config.value('repo')

    # TODO: 
    # * Create Folder, Repo if necessary 
    # * Error

    self.redirect('/')


class APIConfigHandler(APIBaseHandler):
  def get(self):
    pass


class APINavHandler(APIBaseHandler):
  def get(self):
    pass


class APIPageHandler(APIBaseHandler):
  def get(self):
    pass


if __name__ == "__main__":
  print('Starting on localhost:%s' % PORT)
  Pensieve().listen(PORT)
  tornado.ioloop.IOLoop.current().start()
