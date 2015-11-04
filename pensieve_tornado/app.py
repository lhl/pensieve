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
    self.loadconfig()


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


  def saveconfig(self):
    # to write http://pyqt.sourceforge.net/Docs/PyQt5/pyqt_qsettings.html
    del self.config
    self.loadconfig()


  def loadconfig(self):
    self.config = QtCore.QSettings('pensieve', 'tornado')
    try:
      self.repo = self.config.value('repo')
    except:
      self.repo = None
    try:
      self.page = self.config.value('page')
    except:
      self.page = None


class BaseHandler(tornado.web.RequestHandler):
  pass


class APIBaseHandler(BaseHandler):
  pass


class HomeHandler(BaseHandler):
  def get(self):
    print('repo: %s' % self.application.repo)
    print('page: %s' % self.application.page)

    if not self.application.repo:
      self.redirect('/setup')
    elif self.application.page:
      self.redirect('/page/%s' % self.application.page)
    else:
      self.redirect('/page')


class PageHandler(BaseHandler):
  def get(self, page):
    self.render('page.html', title='temp', content='temp', page='page', pages='pages')


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
      self.application.saveconfig()

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
