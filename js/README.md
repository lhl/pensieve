## Summary

You can use `browserify` to compile a bundle:

```
browserify test.js -o test_bundle.js
```

or run `watchify` to automatically update the bundle:

```
watchify test.js -o test_bundle.js
```

## Installation

Make sure you have these helpers installed:
```
npm install -g browserify
npm install -g watchify
```

In the root folder with the `package.json`, get prosemirror ready:
```
npm install
cd node_modules/prosemirror
npm install
npm run dist
```

Edit the test.js and run `browserify` or `watchify` as in the summary. 
You probably want to output the test_bundle into the static folder.
