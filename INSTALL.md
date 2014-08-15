Summary
===
Pensieve is composed of 2 parts:

```
pensieve-node
  Core app and can be run as a stand-alone webapp. Can be run on the server with depencies

pensieve-nodewebkit
  Desktop wrapper. Distributed as a binary. Can be run easily w/ a single executable.
```

You should only need these instructions if you're trying to build/develop/customize either part.


Setting up Node.js + npm
---

# OS X
sudo port selfupdate
sudo port install nodejs
sudo port install npm

# Ubuntu
sudo apt-get update
sudo apt-get install nodejs
sudo apt-get install npm

### node-webkit
sudo npm install –g nodewebkit

### yeoman 
sudo npm install -g yo

### generator-node-webkit
sudo npm install -g generator-node-webkit

### Create Project
yo node-webkit

### Distribute Project
grunt dist-mac
