#!/bin/bash

# requires node-supervisor
# sudo npm -g install supervisor

supervisor -e 'html|js' node app.js
