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
    try:
      content = open(os.path.join(os.path.dirname(__file__), 'save.html')).read()
    except:
      content = 'EMPTY!<hr><br>'
    self.render('main.html', d=d, content=content)

  def post(self):
    content = self.get_argument('content', None)
    print content
    if content != None:
      dest = os.path.join(os.path.dirname(__file__), 'save.html') 
      open(dest, 'w').write(content)

if __name__ == '__main__':
  Application().listen(PORT)
  tornado.ioloop.IOLoop.instance().start()
