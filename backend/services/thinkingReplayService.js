// backend/services/thinkingReplayService.js

const OpenAI = require('openai');
const crypto = require('crypto');

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_CONFIG = {
  model: 'gpt-4-turbo-preview',
  temperature: 0.3,
  maxTokens: 2000,
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  enableCache: true,
  cacheTTL: 3600000, // 1 hour
};

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate snapshots array
 */
function validateSnapshots(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return {
      valid: false,
      error: 'snapshots array is required and must not be empty.',
    };
  }

  for (let i = 0; i < snapshots.length; i++) {
    const s = snapshots[i];
    if (!s.timestamp) {
      return {
        valid: false,
        error: `snapshot ${i} missing timestamp.`,
      };
    }
    if (typeof s.code !== 'string') {
      return {
        valid: false,
        error: `snapshot ${i} code must be a string.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate events array
 */
function validateEvents(events) {
  if (!Array.isArray(events)) {
    return {
      valid: false,
      error: 'events must be an array.',
    };
  }

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e.type) {
      return {
        valid: false,
        error: `event ${i} missing type.`,
      };
    }
    if (!e.timestamp) {
      return {
        valid: false,
        error: `event ${i} missing timestamp.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate submissions array
 */
function validateSubmissions(submissions) {
  if (!Array.isArray(submissions)) {
    return {
      valid: false,
      error: 'submissions must be an array.',
    };
  }

  for (let i = 0; i < submissions.length; i++) {
    const s = submissions[i];
    if (!s.status) {
      return {
        valid: false,
        error: `submission ${i} missing status.`,
      };
    }
    if (!s.timestamp) {
      return {
        valid: false,
        error: `submission ${i} missing timestamp.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate response schema
 */
function validateResponseSchema(replay) {
  const required = [
    'timeline',
    'reasoningSummary',
    'strategyComparison',
    'performanceAnalysis',
    'strategyTags',
  ];

  const missing = required.filter((field) => !replay[field]);

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(', ')}`,
    };
  }

  if (!Array.isArray(replay.timeline) || replay.timeline.length === 0) {
    return {
      valid: false,
      error: 'timeline must be a non-empty array.',
    };
  }

  return { valid: true };
}

// ============================================
// CACHE MANAGER
// ============================================

class CacheManager {
  constructor(ttl = DEFAULT_CONFIG.cacheTTL) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  generateKey(data) {
    const str = JSON.stringify(data);
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttl,
    });
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      ttl: this.ttl,
    };
  }
}

// ============================================
// THINKING REPLAY SERVICE
// ============================================

class ThinkingReplayService {
  constructor(config = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.cache = new CacheManager(this.config.cacheTTL);
    this.stats = {
      totalRequests: 0,
      cachedResponses: 0,
      failedRequests: 0,
      totalTokens: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Generate replay with validation, caching, and retry
   */
  async generateReplay(snapshots, events, submissions, options = {}) {
    const startTime = Date.now();

    try {
      // 1. Validate inputs
      const snapshotsValidation = validateSnapshots(snapshots);
      if (!snapshotsValidation.valid) {
        throw new Error(snapshotsValidation.error);
      }

      const eventsValidation = validateEvents(events);
      if (!eventsValidation.valid) {
        throw new Error(eventsValidation.error);
      }

      const submissionsValidation = validateSubmissions(submissions);
      if (!submissionsValidation.valid) {
        throw new Error(submissionsValidation.error);
      }

      // 2. Check cache
      const cacheKey = this.cache.generateKey({ snapshots, events, submissions });
      const cachedResult = this.cache.get(cacheKey);

      if (cachedResult && this.config.enableCache) {
        console.log('[ThinkingReplay] Cache hit');
        this.stats.cachedResponses++;
        return {
          ...cachedResult,
          fromCache: true,
        };
      }

      // 3. Prepare data
      const analysisData = this.prepareAnalysisData(snapshots, events, submissions);
      const prompt = this.buildPrompt(analysisData, options);

      // 4. Call AI with retry
      const response = await this.callAIWithRetry(prompt, options);

      // 5. Parse and validate response
      const replay = this.parseResponse(response);

      // 6. Validate response schema
      const schemaValidation = validateResponseSchema(replay);
      if (!schemaValidation.valid) {
        throw new Error(`Invalid response schema: ${schemaValidation.error}`);
      }

      // 7. Cache response
      if (this.config.enableCache) {
        this.cache.set(cacheKey, replay);
      }

      const duration = Date.now() - startTime;
      this.stats.totalRequests++;
      this.stats.averageResponseTime =
        (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + duration) /
        this.stats.totalRequests;

      console.log(`[ThinkingReplay] Generated in ${duration}ms`);

      return {
        ...replay,
        fromCache: false,
        metadata: {
          duration,
          tokensUsed: response.usage?.total_tokens || 0,
          model: this.config.model,
        },
      };
    } catch (error) {
      console.error('[ThinkingReplay] Generation failed:', error);
      this.stats.failedRequests++;

      return this.generateFallbackReplay(snapshots, {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Call AI with retry logic and timeout
   */
  async callAIWithRetry(prompt, options = {}, attempt = 1) {
    const model = options.model || this.config.model;
    const timeout = options.timeout || this.config.timeout;
    const maxRetries = options.maxRetries || this.config.maxRetries;

    try {
      const response = await Promise.race([
        this.openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'system',
              content:
                options.systemPrompt || 'You are an expert analyzing problem-solving strategies.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: options.temperature || this.config.temperature,
          max_tokens: options.maxTokens || this.config.maxTokens,
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI call timeout')), timeout);
        }),
      ]);

      this.stats.totalTokens += response.usage?.total_tokens || 0;

      return response;
    } catch (error) {
      console.log(`[ThinkingReplay] Attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.callAIWithRetry(prompt, options, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Prepare analysis data with metadata
   */
  prepareAnalysisData(snapshots, events, submissions) {
    const duration =
      snapshots.length > 0
        ? new Date(snapshots[snapshots.length - 1].timestamp) - new Date(snapshots[0].timestamp)
        : 0;

    return {
      snapshots: snapshots.map((s) => ({
        timestamp: s.timestamp,
        code: s.code,
        status: s.status,
        executionTime: s.execution_time,
        errors: s.errors,
        lineCount: s.code ? s.code.split('\n').length : 0,
      })),
      events: events.map((e) => ({
        type: e.type,
        timestamp: e.timestamp,
      })),
      submissions: submissions.map((s) => ({
        status: s.status,
        timestamp: s.timestamp,
        results: s.results,
      })),
      metadata: {
        totalSnapshots: snapshots.length,
        totalEvents: events.length,
        totalSubmissions: submissions.length,
        duration: Math.round(duration / 1000), // seconds
      },
    };
  }

  /**
   * Build prompt with optional custom instructions
   */
  buildPrompt(data, options = {}) {
    const maxCodeLength = options.maxCodeLength || 500;

    let prompt = `
Analyze this coding session and reconstruct the thinking process.

## Session Summary
- Total Snapshots: ${data.metadata.totalSnapshots}
- Total Events: ${data.metadata.totalEvents}
- Total Submissions: ${data.metadata.totalSubmissions}
- Duration: ${data.metadata.duration} seconds

## Snapshots (chronological):
`;

    data.snapshots.forEach((s, i) => {
      const codeSnippet =
        s.code.length > maxCodeLength
          ? `${s.code.substring(0, maxCodeLength)}\n... [${s.code.length - maxCodeLength} more characters]`
          : s.code;

      prompt += `
Step ${i + 1} [${s.timestamp}]:
- Status: ${s.status}
- Lines: ${s.lineCount}
${s.errors ? `- Errors: ${s.errors.substring(0, 200)}` : ''}
- Code:
\`\`\`
${codeSnippet}
\`\`\`
`;
    });

    if (data.submissions.length > 0) {
      prompt += `
## Submissions:
${data.submissions
  .map(
    (s, i) => `
Submission ${i + 1}: ${s.status} at ${s.timestamp}
`
  )
  .join('\n')}
`;
    }

    prompt += `
## Tasks:
1. Identify the strategy used at each step (Brute Force, Sliding Window, DP, etc.)
2. Explain why strategy changed (if applicable)
3. Analyze performance improvements
4. Suggest better alternatives

Generate response as JSON:
{
  "timeline": [
    {
      "timestamp": "10:03:21",
      "strategy": "Brute Force",
      "reasoning": "Started with simplest approach",
      "code": "// code snippet",
      "performance": { "time": "O(n²)", "space": "O(1)" }
    }
  ],
  "reasoningSummary": "The user started with brute force...",
  "strategyComparison": {
    "from": "Brute Force",
    "to": "Sliding Window",
    "improvement": "Reduced time from O(n²) to O(n)"
  },
  "performanceAnalysis": {
    "optimizations": ["Removed nested loops"],
    "suggestions": ["Consider DP approach"],
    "timeComplexity": "O(n)",
    "spaceComplexity": "O(1)"
  },
  "strategyTags": ["brute_force", "sliding_window"]
}`;

    if (options.customPrompt) {
      prompt += `\n\n${options.customPrompt}`;
    }

    return prompt;
  }

  /**
   * Parse AI response with fallback
   */
  parseResponse(response) {
    try {
      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('No JSON found in AI response');
    } catch (error) {
      console.error('[ThinkingReplay] Parse error:', error);
      throw error;
    }
  }

  /**
   * Generate fallback replay
   */
  generateFallbackReplay(snapshots, errorInfo = null) {
    const timeline =
      snapshots && snapshots.length > 0
        ? snapshots.map((s, i) => ({
            timestamp: s.timestamp || new Date().toLocaleTimeString(),
            strategy: i === 0 ? 'Initial Approach' : 'Continued Work',
            reasoning: i === 0 ? 'Started solving the problem' : 'Refined solution',
            code: s.code?.substring(0, 50) || '',
            performance: { time: 'O(n)', space: 'O(1)' },
          }))
        : [
            {
              timestamp: new Date().toLocaleTimeString(),
              strategy: 'Initial Approach',
              reasoning: 'Started solving the problem',
              code: '',
              performance: { time: 'O(n)', space: 'O(1)' },
            },
          ];

    return {
      timeline,
      reasoningSummary: 'User worked on the problem and made progress.',
      strategyComparison: {
        from: 'Initial',
        to: 'Final',
        improvement: 'Improved solution',
      },
      performanceAnalysis: {
        optimizations: ['Code improvements'],
        suggestions: ['Review alternative approaches'],
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
      },
      strategyTags: ['initial', 'final'],
      fallback: true,
      error: errorInfo || null,
    };
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      cache: this.cache.getStats(),
      config: {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        maxRetries: this.config.maxRetries,
        timeout: this.config.timeout,
        enableCache: this.config.enableCache,
      },
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('[ThinkingReplay] Cache cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    this.config = {
      ...this.config,
      ...config,
    };
    console.log('[ThinkingReplay] Config updated:', this.config);
  }
}

module.exports = ThinkingReplayService;
