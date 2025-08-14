// Client-side background processor for search jobs
// This runs in the browser and processes pending jobs
import { searchJobsService } from './search-jobs.service';
import { gpt5ResponsesService } from './gpt5-responses.service';
import { contentIdeasService } from './database.service';
import { emailService } from './email.service';

class BackgroundProcessor {
  private isProcessing = false;
  private processingInterval: any = null;

  // Start processing pending jobs
  startProcessing() {
    if (this.processingInterval) return;

    // Check for pending jobs every 30 seconds
    this.processingInterval = setInterval(() => {
      this.checkAndProcessJobs();
    }, 30000);

    // Also check immediately
    this.checkAndProcessJobs();
  }

  // Stop processing
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  private async checkAndProcessJobs() {
    if (this.isProcessing) return;

    try {
      const pendingJobs = await searchJobsService.getPendingJobs();
      
      if (pendingJobs.length > 0) {
        console.log(`📋 Found ${pendingJobs.length} pending search jobs`);
        
        // Process the first pending job
        const job = pendingJobs[0];
        await this.processJob(job);
      }
    } catch (error) {
      console.error('Error checking for jobs:', error);
    }
  }

  private async processJob(job: any) {
    this.isProcessing = true;
    console.log(`🔄 Processing search job: ${job.id}`);

    try {
      // Update status to processing
      await searchJobsService.updateStatus(job.id, 'processing', {
        started_at: new Date()
      });

      // Call GPT-5 to generate ideas
      const ideas = await gpt5ResponsesService.searchAndGenerateIdeas(
        job.search_query,
        job.search_params
      );

      console.log(`💡 Generated ${ideas.length} ideas`);

      // Save ideas to database
      const savedIds: string[] = [];
      for (const idea of ideas) {
        const saved = await contentIdeasService.create({
          source: 'ai' as const,
          title: idea.title,
          description: idea.description,
          hook: idea.hook,
          key_points: idea.keyPoints,
          target_audience: idea.targetAudience,
          content_format: idea.contentFormat,
          category: idea.category,
          priority: (idea.engagementScore >= 8 ? 'high' : idea.engagementScore >= 6 ? 'medium' : 'low') as any,
          status: 'ready' as const,
          score: idea.engagementScore,
          ai_model: 'gpt-5',
          ai_reasoning_effort: 'medium' as any,
          linkedin_style: idea.linkedInStyle,
          hashtags: idea.tags
        });

        if (saved) {
          savedIds.push(saved.id);
        }
      }

      // Calculate processing time
      const startTime = new Date(job.started_at || job.created_at).getTime();
      const endTime = new Date().getTime();
      const processingSeconds = Math.floor((endTime - startTime) / 1000);
      const duration = `${Math.floor(processingSeconds / 60)}m ${processingSeconds % 60}s`;

      // Update job as completed
      await searchJobsService.updateStatus(job.id, 'completed', {
        result_count: ideas.length,
        ideas_generated: savedIds,
        result_summary: `Generated ${ideas.length} content ideas`,
        processing_time_seconds: processingSeconds,
        completed_at: new Date()
      });

      // Send email notification
      if (emailService.isConfigured()) {
        const topIdeas = ideas
          .sort((a, b) => b.engagementScore - a.engagementScore)
          .slice(0, 3)
          .map(idea => ({
            title: idea.title,
            description: idea.description,
            score: idea.engagementScore
          }));

        await emailService.sendSearchCompletionEmail({
          searchQuery: job.search_query,
          resultCount: ideas.length,
          topIdeas,
          searchDuration: duration,
          jobId: job.id
        });

        await searchJobsService.markNotificationSent(job.id);
      }

      console.log(`✅ Job ${job.id} completed successfully`);

    } catch (error: any) {
      console.error(`❌ Job ${job.id} failed:`, error);
      
      await searchJobsService.updateStatus(job.id, 'failed', {
        error_message: error.message,
        completed_at: new Date()
      });

      if (emailService.isConfigured()) {
        await emailService.sendSearchFailureEmail(
          job.search_query,
          error.message,
          job.id
        );
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

// Create singleton instance
export const backgroundProcessor = new BackgroundProcessor();

// Auto-start when module loads (in browser only)
if (typeof window !== 'undefined') {
  backgroundProcessor.startProcessing();
  console.log('🚀 Background processor started');
}