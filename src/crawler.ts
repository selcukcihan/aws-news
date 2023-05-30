import { Inject, Service } from 'typedi'
import { Twitter } from './twitter'
import { HeadObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import axiosRetry from 'axios-retry'
import axios from 'axios'
import Parser from 'rss-parser'

axiosRetry(axios, { retries: 3 })

@Service()
export class Crawler {
  constructor(
    private readonly twitter: Twitter,
    @Inject('S3_CLIENT') private readonly s3Client: S3Client,
    @Inject('S3_BUCKET') private readonly s3Bucket: string,
  ) {}

  private async getRssFeed() {
    const parser: Parser = new Parser()
    
    const feed = await parser.parseURL('https://aws.amazon.com/about-aws/whats-new/recent/feed/');
    console.log(`Fetched ${feed.items.length} items from ${feed.pubDate}`)
    return {
      pubDate: +new Date(feed.pubDate),
      items: feed.items.map(item => ({
        guid: item.guid,
        title: item.title as string,
        link: item.link as string,
        pubDate: +new Date(item.pubDate as string),
      })),
    }
  }

  async run() {
    let lastUpdate = (Date.now() - (30 * 24 * 3600 * 1000))
    try {
      console.log('Fetching last update date')
      const metadata = await this.s3Client.send(new GetObjectCommand({
        Key: 'metadata.json',
        Bucket: this.s3Bucket,
      }))

      const body = await metadata.Body?.transformToString() as string
      console.log('Parsing last update date: ' +  body)
      lastUpdate = new Date(JSON.parse(body).lastUpdate).getTime()
    } catch (err) {
      console.log('Error fetching last update date')
      console.log(err)
    }

    const data = await this.getRssFeed()
    console.log(`Last update: ${lastUpdate} and feed update: ${data.pubDate}`)
    if (data.pubDate <= lastUpdate) {
      console.log('No new items found')
      return
    }
    for (const item of data.items) {
      if (item.pubDate <= lastUpdate) {
        console.log(`Skipping ${item.title}`)
        continue
      }

      const existing = await this.s3Client.send(new HeadObjectCommand({
        Key: `${item.guid}.json`,
        Bucket: this.s3Bucket,
      })).catch(() => null)
      if (existing) {
        console.log(`Skipping already saved item ${item.title}`)
        continue
      }

      console.log(`Posting ${item.title}`)
      await this.twitter.post(item.title, item.link)
      await this.s3Client.send(new PutObjectCommand({
        Body: JSON.stringify(item),
        Key: `${item.guid}.json`,
        Bucket: this.s3Bucket,
      }))
    }
    console.log('Saving metadata')
    await this.s3Client.send(new PutObjectCommand({
      Body: JSON.stringify({ lastUpdate: +new Date() }),
      Key: 'metadata.json',
      Bucket: this.s3Bucket,
    }))
  }
}
