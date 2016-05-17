#/usr/bin/env python


from   PyQt5 import QtWidgets
import os
import sys
from   threading import Thread
from   tornado.ioloop import *

# pyssb
sys.path.insert(0, '%s/pyssb/pyssb/' % os.path.dirname(os.path.realpath(__file__)))
from pyssb import *

# pensieve_tornado
from pensieve_tornado.app import *


ssb_config = {'name':'pensieve','title':'Pensieve','url':'http://localhost:11111'}

class PensieveSSB(SSBWindow):
  def __init__(self, ssb_config):
    pass

def pt():
  PORT=11111
  Pensieve().listen(PORT)
  IOLoop.instance().start()

if __name__ == "__main__":
  Thread(target=pt).start()

  app = QtWidgets.QApplication([])
  ssb = SSBWindow(ssb_config)
  ssb.show()
  sys.exit(app.exec_())


'''
class MainWindow(QtGui.QMainWindow):
    def __init__(self):
        QtGui.QMainWindow.__init__(self)
        self.label = QtGui.QLabel("Label!")
        self.setCentralWidget(self.label)

    def closeEvent(self, event):
        IOLoop.instance().stop()

    @gen.coroutine
    def update_label(self):
        label = yield AsyncHTTPClient().fetch(URL)
        if label.error:
            self.label.setText("Error!")
        else:
            self.label.setText(label.body.decode('utf-8'))
'''
