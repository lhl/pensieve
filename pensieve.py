#!/usr/bin/env python

import time
import os
import tornado.ioloop
import tornado.web

import handlers

PORT = 1223

class Application(tornado.web.Application):
  def __init__(self):
    handlers = [
      (r'/', MainHandler),

      # Static Fallback
      (r'/(.*)', tornado.web.StaticFileHandler, {'path': os.path.join(os.path.dirname(__file__), 'www')})
    ]

    settings = {
      'template_path': os.path.join(os.path.dirname(__file__), 'templates'),
      'debug': True
    }

    tornado.web.Application.__init__(self, handlers, **settings)


class MainHandler(tornado.web.RequestHandler):
  def get(self):
    # Template
    d = time.strftime('%Y-%m-%d %I:%M:%S %p')
    self.render('main.html', d=d)

  def post(self):
    # side = self.get_argument('side', None)

    # type - Color, Gray, Lineart
    type = self.get_argument('type', 'Color')
    subprocess.call(['osascript', '-e', 'tell application "ExactScan Pro"', '-e', 'set document type to "%s"' % type, '-e', 'end tell'])


if __name__ == '__main__':
  Application().listen(PORT)
  tornado.ioloop.IOLoop.instance().start()
