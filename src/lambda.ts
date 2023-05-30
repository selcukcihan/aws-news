import 'reflect-metadata'
import { Container } from 'typedi'
import { S3Client } from '@aws-sdk/client-s3'
import { TwitterApi } from 'twitter-api-v2'
import { Crawler } from '../src/crawler'

Container.set('S3_CLIENT', new S3Client({ region: 'eu-west-1' }))
Container.set('S3_BUCKET', process.env.BUCKET)
Container.set('TWITTER_API', new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY as string,
  appSecret: process.env.TWITTER_APP_SECRET as string,
  accessToken: process.env.TWITTER_ACCESS_TOKEN as string,
  accessSecret: process.env.TWITTER_ACCESS_SECRET as string,
}))
Container.set('TWITTER_BEARER_TOKEN', process.env.TWITTER_BEARER_TOKEN as string)

async function handler(event: any) {
  console.log('Started processing...')

  const crawler = Container.get(Crawler)
  await crawler.run()

  console.log('Done...')
}

export { handler }
