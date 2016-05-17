#!/bin/sh
kill `ps aw | grep watchify | grep node | awk '{print $1}'`
