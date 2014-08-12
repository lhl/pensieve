pensieve
========
Pensieve is a personal notebook/wiki.

It exists mainly because I wanted a wiki that had inline editing.


Features
--------
x Inline WYSIWYG Editing
* Automatic Nav/TOC
  * Tagging - multiple hierarchy
  * Load Children in view (transclude)
* Drag and Drop File Attachments
  * Upload
  * Linking
* Privacy
* Comments
* Annotations
* Search & Create
* Track Changes/History
* Logins/Authorship Tracking
* Permissions
  * Visibility
  * Editing
* Running locally/offline and syncing as well as online

V2
--
* Install Script
* Full Auth, User System, Permissions/ownership
* Private and Public Repos, Multiple Repos
  * Private - move into private repo and splice?


Dependencies
------------


Dev Roadmap
-----------
Stored in pensieve

Note Storage
* Gollum-compatible git storage
* Git Backend
* JSON metadata storage


Existing Git-backed Wikis
-------------------------
Gollum
http://jgoodall.me/posts/2012/11/14/git-backed-wiki/
http://www.nomachetejuggling.com/2012/05/15/personal-wiki-using-github-and-gollum-on-os-x/

Sparkleshare - http://sparkleshare.org
WiGit - http://el-tramo.be/wigit/
git-wiki - http://atonie.org/2008/02/git-wiki
Smug - http://www.mcnabbs.org/andrew/smug/
Gitit - http://gitit.net


Similar Projects
----------------
http://tiddlywiki.com/
+ Interesting dynamic loading
+ Pulls references
+ node-webkit: http://tiddlywiki.com/static/TiddlyWiki%2520on%2520node-webkit.html
- Not inline editing / WYSIWYG
- saves everything to a single file
- Nav sorta wonky

https://hackpad.com/ 
+ Etherpad-like editing
+ Lots of interesting Text processing
- Service only
- Not offline
- No Tables/Grids
- Nav sucks ass
- Emails forever
- See also: https://hackpad.com/mwN5#Hackpad-Improvement-Requests

http://scribbleton.com/
- No sync
- Offline only
- No Keyboard shortcuts
- Closed source
- No nav

Evernote
+ Offline
+ Easy inputs
- bad nav/org
- really bad sharing
- no internal linking


License
-------
This code is licensed under the GPLv2 or later, with the following exceptions:

* Froala Editor is included for convenience and is licensed via a [Non Commercial License](http://editor.froala.com/faq). Any commercial use will require you to purchase an appropriate license.
