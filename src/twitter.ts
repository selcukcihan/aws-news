import { Service, Inject } from 'typedi'
import { TwitterApi } from 'twitter-api-v2'


@Service()
export class Twitter {
  constructor(
    @Inject('TWITTER_API') private readonly twitterApi: TwitterApi,
  ) {}

  async post(title: string, link: string) {
    const tweet = `${title} ${link} #AWS #WhatsNew`
    console.log(`Tweeting: ${tweet}`)
    await this.twitterApi.v2.tweet(tweet)
    console.log('Tweeted')
  }
}
