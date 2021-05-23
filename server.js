import { rssWikiConstructor } from './rss.js'
import hash from "https://deno.land/x/object_hash@2.0.3.1/mod.ts";

const risksDigestRSS = "http://catless.ncl.ac.uk/risksrss2.xml"

const rssWiki = await rssWikiConstructor({feedURL: risksDigestRSS})

let lastUpdate = rssWiki.lastUpdate
let lastBuildDate = Date.now()
console.log('last update', lastUpdate, lastBuildDate)

const defaultRoutes = {
  "/favicon.ico": flag,
  "/favicon.png": flag,
  "/system/sitemap.json": sitemap,
  "/system/site-index.json": siteindex,
  "/welcome-visitors.json": welcome
}

let routes = defaultRoutes

// add pages to the available routes
rssWiki.sitemap.forEach((p) => {
  // ignore welcome-vistors
  if ( p.slug != 'welcome-visitors') {
    routes['/'+p.slug+'.json'] = page
  }
})

const headers = {
  "content-type": "application/json",
  "Access-Control-Allow-Origin": "*"
}

addEventListener("fetch", (event) => event.respondWith(handle(event.request)))

function handle(request) {

  let { pathname, search, origin } = new URL(request.url)

  try {
    return routes[pathname](pathname)
  } catch (err) {
    console.log(pathname)
    console.log(routes)
    console.log(err)
    return new Response(`<pre>${err}</pre>`, {status:500})
  }
}

function flag() {
  let text = `<svg viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g1" cx="30%" cy="20%" r="80%" fx="50%" fy="80%">
      <stop offset="0%" stop-color="midnightblue" />
      <stop offset="30%" stop-color="green" />
      <stop offset="60%" stop-color="darkred" />
      <stop offset="70%" stop-color="teal" />
      <stop offset="100%" stop-color="lavender" />
    </radialGradient>
  </defs>
  <rect cx="0%" cy="0%" fx="90%" fy="90%" width="32" height="32" fill="url(#g1)"/>
 </svg>`
 return new Response(text, { headers: { "content-type": "image/svg+xml", "Access-Control-Allow-Origin": "*" } })
}

function sitemap() {
  return new Response(JSON.stringify(rssWiki.sitemap,null,2), { headers })
}

function siteindex() {
  return new Response(JSON.stringify(rssWiki.siteIndex), { headers })
}

async function welcome() {
  const welcomeURL = new URL("welcome-visitors.json", import.meta.url)
  const response = await fetch(welcomeURL)
  return new Response(response.body, { ...response, headers })
}

function page(pathname) {
  let pageJSON = {}
  const slug = pathname.substr(1, pathname.length - 6)
  let count = 0

  function id(slug, count) {
    // just return the first 16 characters of the hash to use as an item id.
    return hash([count, slug]).substring(0, 16)
  }
  
  // Items and Actions are objects with type and properties, some of which are generated automatically. mdn 
  
  function item (type, props) {
    count = count + 1
    return Object.assign({type, id:id(slug, count)}, props)
  }

  function action (type, props) {
    let date = rssWiki.pageData.get(slug).created.date
    return Object.assign({type, date}, props)
  }
  
  function createStory (items) {
    return items.map(each =>
      typeof each == typeof "" ?
        item('paragraph', {text:each}) :
        item(each.type, each)
    )
  }

  const title = rssWiki.pageData.get(slug).title
  const story = createStory(rssWiki.pageData.get(slug).story)
  const journal = [action('create', { item: JSON.parse(JSON.stringify({ title, story })) })]
  
  pageJSON = {
    title,
    story,
    journal
  }

  return new Response(JSON.stringify(pageJSON, null, 2), { headers })
}
