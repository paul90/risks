// jshint esversion:10

// This module will handle the reading of the risks feed.
// Presenting back to the server the data it needs to act as a foreign wiki server.


import { deserializeFeed } from 'https://deno.land/x/rss@0.3.4/mod.ts'
import miniSearch from 'https://cdn.skypack.dev/minisearch@3.0.2'

let lastUpdate

async function fetchAndExtract(url) {
  let sitemap = []
  let pageData = new Map()
  let lastBuildDate
  let siteIndex = new miniSearch({
    fields: ['title', 'content']
  })

  function addPage(spec) {

    const { title, story, created} = spec

    const slug = title.replace(/\s/g, '-').replace(/[^A-Za-z0-9-]/g, '').toLowerCase()

    pageData.set(slug, {
      title,
      story,
      created
    })

    sitemap.push({
      slug,
      title,
      date: created.date,
      synopsis: story[0]
    })

    siteIndex.add({
      'id': slug,
      'title': title,
      'content': story.join(' ')
    })

  }

  await fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch feed')
      }
      return response
    })
    .then(response => {
      lastUpdate = new Date(response.headers['last-modified'])
      return response
    })
    .then(response => response.text())
    .then(str => {
      return deserializeFeed(str)
    })
    .then(deserialized => {
      const { feed /* , feedType */  } = deserialized
      return feed
    })
    .then(feed => {
      const { channel } = feed
      const { title, description } = channel
      lastBuildDate = Date.parse(channel.lastBuildDate)
      addPage({
        title: title,
        story: [ channel.description, `Content created from [${channel.link} ${channel.link}]` ],
        created: {
          date: lastBuildDate
        }
      })
      return channel
    })
    .then(channel => {
      channel.items.forEach(function(item, no) {
        let story = item.description
        // trim pre tags, if present
        if (story.startsWith('<pre>')) {
          story = story.replace(/(^\<pre\>|\<\/pre\>$)/g , '')
        }
        // remove shield and flashlight
        story = story.replace(/(\<i class="shield fad fa-shield"\>\<\/i\>)|\<i class="flashlight fad fa-flashlight"\>\<\/i\>/g, '')
        // wiki-ify links
        function linkReplacer(match, p1, p2, offset, string) {
          return `[${p1} ${p2}]`
        }
        // - risk digest links appear to have a consistent format, so a simple picking appart.
        story = story.replace(/(?:\&lt;)?\<a href="(.*)"\>(.*)\<\/a\>(?:\&gt;)?/g, linkReplacer)

        // split the story into item on double line break.
        const storyArray = story.split('\n\n')
        // remove line breaks in the story items
        storyArray.forEach(function(item, i) {
          item = item.replace(/\n/g, ' ')
          if (item.includes('&')) {
            item = {type: 'markdown', text: item}
          }
          storyArray[i] = item
        })
        storyArray.push({
          type: 'markdown',
          text: `Source: ${item['dc:creator']} via [${item['link']} The Risks Digest]`
        })
        //

        addPage({
          title: item.title,
          story: storyArray,
          created: {
            date: Date.parse(item.pubDate),
            source: item['dc:creator'],
            link: item.link
          }
        })

      })
    })

  return {
    sitemap,
    siteIndex,
    pageData,
    lastUpdate
  }
}

export async function rssWikiConstructor(spec) {
  const { feedURL } = spec

  let { sitemap, siteIndex, pageData, lastBuildDate } = await fetchAndExtract(feedURL)

  console.log('Last update:', lastBuildDate)

  return {
    sitemap,
    siteIndex,
    pageData,
    lastBuildDate
  }
}