# htmldiff-mjs

### HTML Diffing in JavaScript

[![Build Status](https://secure.travis-ci.org/robhicks/htmldiff.mjs.png)](http://travis-ci.org/robhicks/htmldiff.mjs)

`htmldiff-mjs` is a EmcaScript 2015 port of https://github.com/tnwinc/htmldiff.js which is a port of https://github.com/myobie/htmldiff.

This is diffing that understands HTML. Best suited for cases when you
want to show a diff of user-generated HTML (like from a wysiwyg editor).

##Usage
You use it like this:

```JavaScript
import { diff } from 'htmldiff-mjs';

console.log(diff('<p>this is some text</p>', '<p>this is some more text</p>'));
```

And you get:

```html
<p>this is some <ins>more </ins>text</p>
```

Licensed under the MIT License. See the `LICENSE` file for details.
