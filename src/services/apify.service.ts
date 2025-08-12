import { apiConfig } from '../lib/api-config';

export interface LinkedInProfile {
  url: string;
  name: string;
  headline?: string;
  location?: string;
  followerCount?: number;
  connectionCount?: number;
  about?: string;
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    description?: string;
  }>;
  profilePicture?: string;
}

export interface LinkedInPost {
  url: string;
  authorName: string;
  authorUrl: string;
  authorHeadline?: string;
  content: string;
  postedAt: Date;
  reactions: number;
  comments: number;
  shares: number;
  media?: Array<{
    type: 'image' | 'video' | 'document';
    url: string;
  }>;
  hashtags: string[];
  mentions: string[];
}

export interface ScrapingTask {
  id: string;
  type: 'profile' | 'posts' | 'trending';
  status: 'pending' | 'running' | 'completed' | 'failed';
  targetUrl?: string;
  keyword?: string;
  results?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// Apify Actor IDs for LinkedIn scraping
const APIFY_ACTORS = {
  PROFILE_SCRAPER: 'heLL6fUofdPgRXZie',
  POST_SCRAPER: 'JHkNChPje8RV5fKLH',
  SEARCH_SCRAPER: 'GIbsBAGdlu0OEh3hx',
};

class ApifyService {
  private apiToken: string | null;
  private baseUrl = 'https://api.apify.com/v2';

  constructor() {
    this.apiToken = apiConfig.apify.apiToken;
  }

  private isConfigured(): boolean {
    return !!this.apiToken;
  }

  // Scrape LinkedIn profile
  async scrapeProfile(profileUrl: string): Promise<LinkedInProfile | null> {
    if (!this.isConfigured()) {
      return this.getMockProfile(profileUrl);
    }

    try {
      // Start the actor run
      const runResponse = await fetch(
        `${this.baseUrl}/acts/${APIFY_ACTORS.PROFILE_SCRAPER}/runs?token=${this.apiToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profileUrls: [profileUrl],
            proxyConfiguration: {
              useApifyProxy: true,
              apifyProxyGroups: ['RESIDENTIAL'],
            },
          }),
        }
      );

      if (!runResponse.ok) {
        throw new Error(`Apify API error: ${runResponse.statusText}`);
      }

      const run = await runResponse.json();
      const runId = run.data.id;

      // Wait for the run to complete (polling)
      const result = await this.waitForRun(runId);
      
      if (result && result.length > 0) {
        return this.transformProfileData(result[0]);
      }

      return null;
    } catch (error) {
      console.error('Error scraping LinkedIn profile:', error);
      return this.getMockProfile(profileUrl);
    }
  }

  // Scrape posts from a LinkedIn profile or company page
  async scrapePosts(
    profileUrl: string,
    limit = 10
  ): Promise<LinkedInPost[]> {
    if (!this.isConfigured()) {
      return this.getMockPosts(profileUrl, limit);
    }

    try {
      const runResponse = await fetch(
        `${this.baseUrl}/acts/${APIFY_ACTORS.POST_SCRAPER}/runs?token=${this.apiToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profileUrl,
            postsCount: limit,
            proxyConfiguration: {
              useApifyProxy: true,
              apifyProxyGroups: ['RESIDENTIAL'],
            },
          }),
        }
      );

      if (!runResponse.ok) {
        throw new Error(`Apify API error: ${runResponse.statusText}`);
      }

      const run = await runResponse.json();
      const runId = run.data.id;

      const result = await this.waitForRun(runId);
      
      if (result && Array.isArray(result)) {
        return result.map(post => this.transformPostData(post));
      }

      return [];
    } catch (error) {
      console.error('Error scraping LinkedIn posts:', error);
      return this.getMockPosts(profileUrl, limit);
    }
  }

  // Search for trending content by keyword
  async searchTrendingContent(
    keyword: string,
    limit = 20
  ): Promise<LinkedInPost[]> {
    if (!this.isConfigured()) {
      return this.getMockTrendingPosts(keyword, limit);
    }

    try {
      const runResponse = await fetch(
        `${this.baseUrl}/acts/${APIFY_ACTORS.SEARCH_SCRAPER}/runs?token=${this.apiToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            searchQuery: keyword,
            resultLimit: limit,
            sortBy: 'relevance',
            timeFilter: 'past-week',
            proxyConfiguration: {
              useApifyProxy: true,
              apifyProxyGroups: ['RESIDENTIAL'],
            },
          }),
        }
      );

      if (!runResponse.ok) {
        throw new Error(`Apify API error: ${runResponse.statusText}`);
      }

      const run = await runResponse.json();
      const runId = run.data.id;

      const result = await this.waitForRun(runId);
      
      if (result && Array.isArray(result)) {
        return result
          .map(post => this.transformPostData(post))
          .sort((a, b) => b.reactions - a.reactions);
      }

      return [];
    } catch (error) {
      console.error('Error searching trending content:', error);
      return this.getMockTrendingPosts(keyword, limit);
    }
  }

  // Discover top creators in a niche
  async discoverCreators(
    industry: string,
    minFollowers = 5000
  ): Promise<LinkedInProfile[]> {
    if (!this.isConfigured()) {
      return this.getMockCreators(industry, minFollowers);
    }

    try {
      const runResponse = await fetch(
        `${this.baseUrl}/acts/${APIFY_ACTORS.SEARCH_SCRAPER}/runs?token=${this.apiToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            searchQuery: `${industry} thought leader influencer`,
            resultType: 'people',
            resultLimit: 20,
            proxyConfiguration: {
              useApifyProxy: true,
              apifyProxyGroups: ['RESIDENTIAL'],
            },
          }),
        }
      );

      if (!runResponse.ok) {
        throw new Error(`Apify API error: ${runResponse.statusText}`);
      }

      const run = await runResponse.json();
      const runId = run.data.id;

      const result = await this.waitForRun(runId);
      
      if (result && Array.isArray(result)) {
        return result
          .map(profile => this.transformProfileData(profile))
          .filter(p => (p.followerCount || 0) >= minFollowers);
      }

      return [];
    } catch (error) {
      console.error('Error discovering creators:', error);
      return this.getMockCreators(industry, minFollowers);
    }
  }

  // Helper: Wait for Apify run to complete
  private async waitForRun(runId: string, maxWaitTime = 60000): Promise<any> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const statusResponse = await fetch(
        `${this.baseUrl}/actor-runs/${runId}?token=${this.apiToken}`
      );

      if (!statusResponse.ok) {
        throw new Error('Failed to check run status');
      }

      const status = await statusResponse.json();

      if (status.data.status === 'SUCCEEDED') {
        // Get the results
        const resultsResponse = await fetch(
          `${this.baseUrl}/actor-runs/${runId}/dataset/items?token=${this.apiToken}`
        );

        if (!resultsResponse.ok) {
          throw new Error('Failed to fetch results');
        }

        const results = await resultsResponse.json();
        return results;
      } else if (status.data.status === 'FAILED' || status.data.status === 'ABORTED') {
        throw new Error(`Run failed with status: ${status.data.status}`);
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('Run timed out');
  }

  // Transform Apify profile data to our format
  private transformProfileData(data: any): LinkedInProfile {
    return {
      url: data.url || data.profileUrl,
      name: data.name || data.fullName,
      headline: data.headline || data.title,
      location: data.location,
      followerCount: data.followers || data.followerCount,
      connectionCount: data.connections || data.connectionCount,
      about: data.about || data.summary,
      experience: data.experience || [],
      profilePicture: data.profilePicture || data.imageUrl,
    };
  }

  // Transform Apify post data to our format
  private transformPostData(data: any): LinkedInPost {
    return {
      url: data.url || data.postUrl,
      authorName: data.authorName || data.author,
      authorUrl: data.authorUrl || data.authorProfileUrl,
      authorHeadline: data.authorHeadline || data.authorTitle,
      content: data.text || data.content,
      postedAt: new Date(data.postedAt || data.timestamp),
      reactions: data.reactions || data.likesCount || 0,
      comments: data.comments || data.commentsCount || 0,
      shares: data.shares || data.sharesCount || 0,
      media: data.media || [],
      hashtags: this.extractHashtags(data.text || data.content),
      mentions: this.extractMentions(data.text || data.content),
    };
  }

  // Extract hashtags from text
  private extractHashtags(text: string): string[] {
    const regex = /#\w+/g;
    const matches = text.match(regex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  // Extract mentions from text
  private extractMentions(text: string): string[] {
    const regex = /@\w+/g;
    const matches = text.match(regex);
    return matches ? matches.map(mention => mention.substring(1)) : [];
  }

  // Mock data generators for development
  private getMockProfile(url: string): LinkedInProfile {
    return {
      url,
      name: 'John Doe',
      headline: 'Founder & CEO | Building the future of work',
      location: 'San Francisco Bay Area',
      followerCount: 25000,
      connectionCount: 500,
      about: 'Passionate about innovation and helping startups scale...',
      profilePicture: 'https://via.placeholder.com/200',
    };
  }

  private getMockPosts(profileUrl: string, limit: number): LinkedInPost[] {
    const posts: LinkedInPost[] = [];
    const topics = [
      'The future of AI in business is here',
      '5 lessons from scaling a startup to $10M ARR',
      'Why remote work is transforming company culture',
      'The most important skill for 2024? Adaptability',
      'How we increased productivity by 40% with this simple change',
    ];

    for (let i = 0; i < Math.min(limit, topics.length); i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const postedAt = new Date();
      postedAt.setDate(postedAt.getDate() - daysAgo);

      posts.push({
        url: `https://linkedin.com/posts/${i}`,
        authorName: 'John Doe',
        authorUrl: profileUrl,
        authorHeadline: 'Founder & CEO',
        content: `${topics[i]}\n\nHere's what I learned...\n\n[Mock content - Apify not configured]`,
        postedAt,
        reactions: Math.floor(Math.random() * 1000) + 100,
        comments: Math.floor(Math.random() * 100) + 10,
        shares: Math.floor(Math.random() * 50) + 5,
        hashtags: ['leadership', 'innovation', 'startups'],
        mentions: [],
      });
    }

    return posts;
  }

  private getMockTrendingPosts(keyword: string, limit: number): LinkedInPost[] {
    const posts = this.getMockPosts('https://linkedin.com/trending', limit);
    
    // Filter and enhance based on keyword
    return posts.map(post => ({
      ...post,
      content: post.content.replace('[Mock content', `[Trending ${keyword} content`),
      reactions: post.reactions * 2, // Trending posts have more engagement
    }));
  }

  private getMockCreators(industry: string, minFollowers: number): LinkedInProfile[] {
    const creators = [
      {
        url: 'https://linkedin.com/in/creator1',
        name: 'Sarah Chen',
        headline: `${industry} Expert | Keynote Speaker`,
        followerCount: minFollowers + 10000,
      },
      {
        url: 'https://linkedin.com/in/creator2',
        name: 'Michael Roberts',
        headline: `${industry} Thought Leader | Author`,
        followerCount: minFollowers + 5000,
      },
      {
        url: 'https://linkedin.com/in/creator3',
        name: 'Emily Johnson',
        headline: `${industry} Innovator | Founder`,
        followerCount: minFollowers + 15000,
      },
    ];

    return creators.map(c => ({
      ...c,
      location: 'Global',
      connectionCount: 500,
      about: `Leading voice in ${industry}...`,
      profilePicture: 'https://via.placeholder.com/200',
    }));
  }

  // Batch operations for efficiency
  async batchScrapeProfiles(profileUrls: string[]): Promise<LinkedInProfile[]> {
    const results: LinkedInProfile[] = [];
    
    // Process in batches of 5 to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < profileUrls.length; i += batchSize) {
      const batch = profileUrls.slice(i, i + batchSize);
      const batchPromises = batch.map(url => this.scrapeProfile(url));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null) as LinkedInProfile[]);
      
      // Add delay between batches
      if (i + batchSize < profileUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }

  // Schedule recurring scraping tasks
  scheduleRecurringScraping(
    profileUrls: string[],
    intervalHours = 24,
    callback?: (results: LinkedInPost[]) => void
  ): NodeJS.Timer {
    const scrapeTask = async () => {
      console.log(`Starting scheduled scraping for ${profileUrls.length} profiles`);
      
      for (const url of profileUrls) {
        try {
          const posts = await this.scrapePosts(url, 5);
          if (callback) {
            callback(posts);
          }
        } catch (error) {
          console.error(`Failed to scrape ${url}:`, error);
        }
      }
    };

    // Run immediately
    scrapeTask();

    // Schedule recurring
    return setInterval(scrapeTask, intervalHours * 60 * 60 * 1000);
  }

  // Quality score calculation for scraped content
  calculateQualityScore(post: LinkedInPost): number {
    const engagementRate = (post.reactions + post.comments * 2 + post.shares * 3) / 100;
    const hasMedia = post.media && post.media.length > 0 ? 0.1 : 0;
    const contentLength = Math.min(post.content.length / 1000, 0.3);
    const recency = Math.max(0, 1 - (Date.now() - post.postedAt.getTime()) / (30 * 24 * 60 * 60 * 1000));
    
    return Math.min(1, engagementRate * 0.5 + hasMedia + contentLength + recency * 0.2);
  }
}

// Export singleton instance
export const apifyService = new ApifyService();