# Federated Wiki: Foreign Server with RSS sourced content

A little experiment in writing a small foreign server targetting [Deno Deploy](https://deno.com/deploy). Using [The Risks Digest](http://catless.ncl.ac.uk/Risks/) RSS feed as a data source, just cause it is something convient and might even be useful.

In this first iteration the Risks Digest is only loaded, and converted into pages, at start-up. If a new digest is published the content of this foreign federated wiki server will not get update with this new content.

Some notable things to note:
* minisearch is used to create a full text index, in `rss.js` see lines:
  * 8 importing minisearch
  * 16-18 creating the empty index
  * 39-43 adding page text to index

  and in `server.js`:
  * 63-65 serving the site index

* the `id` function will create a reproduceable item id, using the page slug and the item number to create a hash.
