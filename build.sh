#!/bin/bash
# Borrowed from React CDK.

echo "=> Transpiling 'src' into ES5 ..."
echo ""
rm -rf ./dist && mkdir dist
NODE_ENV=production ./node_modules/.bin/babel --ignore tests ./src --out-file ./dist/fuzzy-match-utils.js
NODE_ENV=production ./node_modules/.bin/uglifyjs dist/fuzzy-match-utils.js -o dist/fuzzy-match-utils.min.js -m
echo ""
echo "=> Transpiling completed."
