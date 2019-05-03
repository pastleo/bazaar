#!/bin/sh

version=$(date +%g%m%d%H%M)
sed 's/src="lib\/index.js"/src="'$version'-lib\/index.js"/' web_client/dev.html > web_client/index.html
rm -f web_client/*-lib
ln -s lib "web_client/$version-lib"
