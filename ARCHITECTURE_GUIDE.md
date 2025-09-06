# 🏗️ Koval Deep AI - Architectural Consistency Guide

## 🎯 Project Vision & End Goals

### Primary Mission

Create a **subscription-based AI-powered freediving training assistant** that provides:

- **Paid Subscription Model**: Monthly PayPal billing with Supabase user management
- **Intelligent Analysis**: AI-powered dive log and image analysis using GPT Vision
- **E.N.C.L.O.S.E. Framework**: Depth-specific coaching based on freediving methodology
- **Pattern Recognition**: Multi-dive analysis to identify training patterns and issues
- **Knowledge-Based Coaching**: Pinecone-powered responses to freediving questions
- **Safety Focus**: Proactive safety recommendations and risk assessment

### Complete User Journey

1. **Registration & Payment**: User registers and subscribes via PayPal monthly billing
2. **Account Creation**: Supabase creates user database for dive logs, images, and AI data
3. **Access Grant**: Authenticated users gain access to KovalAI platform
4. **Dive Logging**: Users upload dive logs with images to the dive journal
5. **AI Analysis**: GPT Vision analyzes dive logs and images for metrics and insights
6. **Smart Coaching**: Pinecone knowledge base provides E.N.C.L.O.S.E.-based feedback
7. **Pattern Analysis**: AI processes multiple dive logs to identify training patterns
8. **Continuous Learning**: Users can ask any freediving question for intelligent responses

### Architectural Philosophy

**"Subscription-First, AI-Powered, Safety-Focused Platform"**

- Monetization through subscription model with PayPal integration
- AI-driven analysis pipeline for comprehensive dive evaluation
- Knowledge-based coaching using proven freediving methodologies
- Preserve what works, enhance what's needed through surgical improvements
- Build for long-term maintainability and scalable AI processing

---

## 🔄 Hybrid Router Strategy (Critical)

### Why Hybrid Architecture?

```
Pages Router (/pages/)          App Router (/app/)
├── Established Features       ├── Modern Features
├── Working Integrations       ├── Enhanced UX
├── Stable APIs               ├── Advanced Patterns
└── User Trust                └── Future Growth

         ↓
   SEAMLESS COEXISTENCE
```

### Router Responsibility Matrix

| Feature Category                   | Router       | Rationale                                           |
| ---------------------------------- | ------------ | --------------------------------------------------- |
| **PayPal Integration & Billing**   | Pages Router | Stable webhook handling and subscription management |
| **User Registration & Auth**       | Pages Router | Proven Supabase auth flow with PayPal linking       |
| **Core Chat Interface**            | Pages Router | Established, working OpenAI integration             |
| **API Endpoints**                  | Pages Router | Stable, trusted backend routes for billing and AI   |
| **Dashboard & Analytics**          | Pages Router | Complex state management works well                 |
| **Dive Log Upload & Management**   | App Router   | Modern UX, form handling, file upload benefits      |
| **AI Analysis Pipeline UI**        | App Router   | Real-time updates, streaming analysis results       |
| **Pattern Analysis Visualization** | App Router   | Advanced charts, data visualization components      |
| **Advanced UI Components**         | App Router   | Streaming, suspense, modern patterns                |

### Cross-Router Communication Pattern

```typescript
// Shared Data Layer (lib/shared/)
export class DiveLogService {
  static async getDiveLogs(userId: string) {
    // Single source of truth for both routers
    return supabase.from("dive_logs").select("*").eq("user_id", userId);
  }

  static async saveDiveLogWithAnalysis(logData: DiveLog, imageFile: File) {
    // 1. Save dive log and image to Supabase
    const savedLog = await this.saveDiveLog(logData, userId);

    // 2. Enqueue analysis job
    await this.enqueueAnalysis(savedLog.id);

    // 3. Return immediately, analysis happens async
    return savedLog;
  }
}

export class BillingService {
  static async checkSubscriptionStatus(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", userId)
      .single();

    return data?.subscription_status === "active";
  }
}

// Pages Router Usage (pages/dashboard.js)
const logs = await DiveLogService.getDiveLogs(user.id);
const hasAccess = await BillingService.checkSubscriptionStatus(user.id);

// App Router Usage (app/dive-logs/page.tsx)
const logs = await DiveLogService.getDiveLogs(user.id);
```

---

## 💰 Subscription & Billing Architecture

### Billing ↔ Auth ↔ Entitlements Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    REGISTRATION FLOW                        │
├─────────────────────────────────────────────────────────────┤
│  User Registration → PayPal Subscription → Supabase Profile │
│  1. User signs up    2. PayPal billing   3. Database record │
└─────────────────┬───────────────────────────────┬───────────┘
                  │                               │
┌─────────────────▼───────────────────────────────▼───────────┐
│                 ENTITLEMENT SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│  Supabase Profiles     │  PayPal Webhooks   │  Access Gates │
│  - User identity       │  - Billing events  │  - Route protection│
│  - Subscription status │  - Payment status  │  - Feature gating │
└─────────────────┬───────────────────────────────┬───────────┘
                  │                               │
┌─────────────────▼───────────────────────────────▼───────────┐
│                   ACCESS CONTROL                            │
├─────────────────────────────────────────────────────────────┤
│  Middleware Checks     │  Grace Periods     │  Dunning Flow │
│  - subscription_status │  - 3-7 day grace   │  - Email notices│
│  - active/trialing OK  │  - Soft warnings   │  - Access revoke│
└─────────────────────────────────────────────────────────────┘
```

### Data Model for Subscription Management

```sql
-- Core subscription tracking in profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS paypal_payer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'monthly';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_grace_until TIMESTAMPTZ;

-- Billing events audit trail
CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL, -- 'activated', 'payment_failed', 'cancelled'
  paypal_event_id TEXT UNIQUE,
  event_data JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### PayPal Webhook Integration Pattern

```typescript
// pages/api/webhooks/paypal.ts
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  // Verify PayPal webhook signature
  const isValid = await verifyPayPalWebhook(req);
  if (!isValid) return res.status(401).json({ error: "Invalid signature" });

  const { event_type, resource } = req.body;

  switch (event_type) {
    case "BILLING.SUBSCRIPTION.ACTIVATED":
      await handleSubscriptionActivated(resource);
      break;
    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
      await handlePaymentFailed(resource);
      break;
    case "BILLING.SUBSCRIPTION.CANCELLED":
      await handleSubscriptionCancelled(resource);
      break;
  }

  res.status(200).json({ received: true });
}

async function handleSubscriptionActivated(resource: any) {
  const { id: subscriptionId, subscriber } = resource;

  await supabase.from("profiles").upsert({
    paypal_subscription_id: subscriptionId,
    paypal_payer_id: subscriber.payer_id,
    subscription_status: "active",
    subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
}
```

---

## 🧠 AI Integration Architecture

### ACTUAL DIVE LOG & IMAGE ANALYSIS PIPELINE (Current Implementation)

**🚨 CRITICAL DISCONNECT IDENTIFIED**: The OpenAI Vision API pipeline for dive log and image analysis has workflow breaks that prevent proper completion.

**🔍 FOREIGN KEY CONSTRAINT ANALYSIS - RESOLVED**:
The foreign key constraint issue was actually **SOLVED** via an elegant workaround:

- The `save-dive-log.js` endpoint automatically creates a deterministic UUID from test user strings
- It creates a corresponding `auth.users` record if one doesn't exist
- This bypasses the foreign key constraint entirely
- **Result**: Dive logs ARE being saved successfully to Supabase

**🚨 REAL ISSUES IDENTIFIED**:

1. **UI Dialog Not Closing**: Save confirmation dialog stays open after successful save
2. **Missing Post-Save Coaching**: No automatic AI analysis triggered after dive log save
3. **No Visual Feedback**: User doesn't know the save was successful
4. **Missing Integration**: OpenAI Vision analysis not connected to coaching pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    DIVE JOURNAL UI FLOW                     │
├─────────────────────────────────────────────────────────────┤
│  1. User fills out dive log form (DiveJournalDisplay.jsx)   │
│  2. User uploads dive computer image                         │
│  3. User clicks "Save Entry" button                         │
│  4. handleSubmit() function triggers                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                IMAGE ANALYSIS STEP                          │
├─────────────────────────────────────────────────────────────┤
│  📸 STEP 1: Image Upload & OpenAI Vision Analysis         │
│  - FormData sent to /api/dive/upload-image                 │
│  - OpenAI Vision API analyzes dive computer image          │
│  - ✅ WORKING: Extracts depth, time, temperature, alerts  │
│  - ✅ WORKING: Returns imageId, imageUrl, analysis results │
│                                                             │
│  🎯 STATUS: This step is WORKING and extracting metrics    │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                 DIVE LOG SAVE STEP                          │
├─────────────────────────────────────────────────────────────┤
│  💾 STEP 2: Save to Supabase                              │
│  - POST to /api/supabase/save-dive-log                    │
│  - ✅ WORKING: Includes dive data + OpenAI Vision results │
│  - ✅ WORKING: Saves to dive_logs table with ai_analysis  │
│                                                             │
│  🚨 REMAINING ISSUE: Dialog not closing after save        │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                   AI COACHING STEP                          │
├─────────────────────────────────────────────────────────────┤
│  🧠 STEP 3: KovalAI Analysis & Coaching                   │
│  - ✅ AVAILABLE: /api/analyze/dive-log-openai endpoint    │
│  - ✅ AVAILABLE: OpenAI Vision data from previous steps   │
│  - Should analyze extracted metrics from Vision API        │
│  - Should provide personalized coaching feedback           │
│                                                             │
│  🚨 CRITICAL DISCONNECT: Auto-coaching NOT triggered!      │
│  - Save completes but no coaching analysis starts          │
│  - Vision analysis data not fed into coaching pipeline     │
│  - No integration between dive save and AI coaching        │
└─────────────────────────────────────────────────────────────┘
```

### MISSING INTEGRATION: Dive Log → AI Coaching Pipeline

**Expected Flow After Save:**

1. ✅ Dive log saved to Supabase with OpenAI Vision analysis results
2. ❌ **MISSING**: Auto-trigger KovalAI coaching using Vision data
3. ❌ **MISSING**: Generate coaching feedback combining Vision + Daniel's knowledge
4. ❌ **MISSING**: Display coaching results in chat interface
5. ❌ **MISSING**: Save coaching session to chat history

**Required Components to Complete Pipeline:**

```typescript
// POST-SAVE COACHING TRIGGER (Missing Implementation)
async function triggerPostSaveCoaching(diveLogId: string, userId: string) {
  // 1. Load saved dive log with OpenAI Vision analysis results
  const diveLog = await loadDiveLogWithVisionAnalysis(diveLogId);

  // 2. Extract metrics from Vision API results (already available)
  const visionMetrics = diveLog.ai_analysis.vision_analysis.extracted_data;

  // 3. Generate coaching prompt with dive data + Vision metrics
  const coachingPrompt = generateDiveCoachingPrompt(diveLog, visionMetrics);

  // 4. Query Daniel's knowledge base for relevant guidance
  const knowledgeContext = await queryDanielsKnowledge(diveLog);

  // 5. Send to OpenAI for coaching analysis (combining Vision + Knowledge)
  const coachingFeedback = await generateCoachingFeedback(
    coachingPrompt,
    knowledgeContext,
    visionMetrics
  );

  // 6. Save coaching session to chat history
  await saveChatMessage(userId, coachingFeedback, "dive_log_analysis");

  // 7. Notify UI to display coaching results
  await notifyCoachingComplete(diveLogId, coachingFeedback);
}

// INTEGRATION POINTS NEEDED:
// - DiveJournalDisplay.jsx: Call triggerPostSaveCoaching() after successful save
// - Chat interface: Display coaching results automatically
// - Supabase: Link coaching sessions to dive logs
```

### CURRENT ENDPOINTS STATUS:

**✅ WORKING:**

- `/api/dive/upload-image` - ✅ OpenAI Vision analysis extracting metrics from images
- `/api/openai/upload-dive-image-vision.js` - ✅ Complete Vision API implementation
- `/api/supabase/save-dive-log` - ✅ Saves dive logs with Vision analysis results
- `/api/openai/chat` - ✅ General chat with KovalAI
- `/api/analyze/dive-log-openai` - ✅ Coaching analysis endpoint ready

**❌ MISSING/BROKEN:**

- Post-save coaching trigger (Vision data → KovalAI coaching)
- UI dialog closing confirmation
- Vision analysis → chat integration
- Automatic coaching analysis using extracted metrics
- User feedback for successful saves

### Pinecone Knowledge Base Architecture

```
/data/ FOLDER STRUCTURE (Source of Truth for AI Knowledge)
├── enclose/                    # E.N.C.L.O.S.E. diagnostic framework
├── Safety/                     # Safety protocols & risk assessment
├── training plan structure/    # Training methodologies & progression
├── Equalization/              # EQ techniques & troubleshooting
├── fundamentals/              # Core freediving principles
├── coaching/                  # Coaching strategies & feedback
├── physics/                   # Freediving physics & physiology
├── equipment/                 # Gear recommendations & usage
├── meditation/                # Mental training & relaxation
├── mouthfill/                 # Advanced equalization techniques
├── npd/                       # Negative pressure dive protocols
├── mdr/                       # Mammalian dive response training
└── user logic/                # User interaction patterns
```

### AI Service Patterns

````typescript
// Core Dive Analysis Pipeline
export class DiveAnalysisService {
  private visionAI: OpenAI;
  private knowledgeBase: PineconeService;
  private storage: SupabaseStorage;

  async analyzeDiveLog(logId: string, imageFile: File): Promise<AnalysisResult> {
    // 1. Store analysis job
    const job = await this.createAnalysisJob(logId);

    try {
      // 2. Extract metrics from image using GPT Vision
      const metrics = await this.extractMetricsFromImage(imageFile);

      // 3. Query specialized knowledge base sections
      const coaching = await this.generateCoaching(metrics);

      // 4. Store results and update job status
      const result = await this.storeAnalysisResult(logId, metrics, coaching);
      await this.markJobComplete(job.id);

      // 5. Notify user via real-time update
      await this.notifyAnalysisComplete(logId);

      return result;
    } catch (error) {
      await this.markJobFailed(job.id, error.message);
      throw error;
    }
  }

  private async extractMetricsFromImage(imageFile: File): Promise<DiveMetrics> {
    const base64Image = await this.convertToBase64(imageFile);

    const response = await this.visionAI.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: `Extract freediving metrics from this dive computer/watch image.
                   Return JSON with: depth, dive_time, surface_interval, heart_rate, etc.`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this dive log image:" },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` }}
          ]
        }
      ],
      max_tokens: 1000
    });

    return JSON.parse(response.choices[0].message.content);
  }

  private async generateCoaching(metrics: DiveMetrics): Promise<CoachingResult> {
    // 1. Query E.N.C.L.O.S.E. methodology from Pinecone
    const encloseData = await this.knowledgeBase.queryKnowledgeSection(
      'enclose',
      `${metrics.depth}m ${metrics.discipline} issues equalization safety`
    );

    // 2. Get depth-specific safety protocols
    const safetyData = await this.knowledgeBase.queryKnowledgeSection(
      'Safety',
      `${metrics.depth}m blackout LMC safety protocols`
    );

    // 3. Query training progression guidelines
    const trainingData = await this.knowledgeBase.queryKnowledgeSection(
      'training plan structure',
      `${metrics.depth}m progression training plan ${metrics.experience_level}`
    );

    // 4. Check for equalization issues
    const eqData = await this.knowledgeBase.queryKnowledgeSection(
      'Equalization',
      `${metrics.depth}m equalization mouthfill reverse pack`
    );

    // 5. Generate personalized coaching based on comprehensive knowledge
    const coaching = await this.visionAI.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are KovalAI, an expert freediving coach using Daniel Koval's methodology.
                   Analyze this dive using E.N.C.L.O.S.E. framework and provide specific feedback.

                   Key Principles:
                   - Safety first: Always check for LMC, blackout, narcosis risks
                   - E.N.C.L.O.S.E. diagnostic routing for problem identification
                   - Level-appropriate training recommendations
                   - Depth-specific safety protocols
                   - Progressive training structure following FII standards`
        },
        {
          role: "user",
          content: `Analyze this dive log:

                   DIVE METRICS: ${JSON.stringify(metrics)}

                   KNOWLEDGE BASE CONTEXT:
                   E.N.C.L.O.S.E. Framework: ${JSON.stringify(encloseData)}
                   Safety Protocols: ${JSON.stringify(safetyData)}
                   Training Guidelines: ${JSON.stringify(trainingData)}
                   Equalization Data: ${JSON.stringify(eqData)}

                   Provide comprehensive coaching covering:
                   1. Safety assessment (any red flags?)
                   2. E.N.C.L.O.S.E. category identification if issues exist
                   3. Technique analysis and improvements
                   4. Training progression recommendations
                   5. Next session suggestions`
        }
      ]
    });

    return {
      feedback: coaching.choices[0].message.content,
      safety_flags: this.assessSafetyRisks(metrics),
      enclose_category: this.categorizeByEnclose(metrics),
      next_actions: this.suggestTrainingActions(metrics),
      knowledge_sources: ['enclose', 'Safety', 'training plan structure', 'Equalization']
    };
  }

  // Pinecone Knowledge Base Service
  private async queryKnowledgeSection(section: string, query: string) {
    const embedding = await this.visionAI.embeddings.create({
      model: "text-embedding-ada-002",
      input: query,
    });

    return await this.knowledgeBase.query({
      vector: embedding.data[0].embedding,
      topK: 3,
      filter: { section: section }, // Filter by knowledge section
      includeMetadata: true,
    });
  }
}

// Async Job Processing System
export class AnalysisJobProcessor {
  async processQueue() {
    const pendingJobs = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(5);

    for (const job of pendingJobs.data) {
      await this.processJob(job);
    }
  }

  private async processJob(job: AnalysisJob) {
    try {
      await this.updateJobStatus(job.id, 'running');

      const result = await DiveAnalysisService.analyzeDiveLog(
        job.dive_log_id,
        job.image_path
      );

      await this.updateJobStatus(job.id, 'completed');
    } catch (error) {
      await this.handleJobError(job.id, error);
    }
  }
}

---

## 📚 Knowledge Base Architecture (Pinecone)

### Complete Freediving Knowledge Repository

All KovalAI intelligence comes from the `/data/` folder, which contains Daniel Koval's comprehensive freediving methodology:

```
📚 KNOWLEDGE DOMAINS
├── 🔧 E.N.C.L.O.S.E. Framework (/enclose/)
│   ├── Diagnostic routing for problem identification
│   ├── Issue categorization (Equalization, Narcosis, CO₂, etc.)
│   └── Solution pathways for each category
│
├── 🛡️ Safety Protocols (/Safety/)
│   ├── Hypoxia, LMC, and Blackout prevention
│   ├── Surface interval calculations
│   ├── Rescue protocols and emergency procedures
│   └── Risk assessment frameworks
│
├── 📋 Training Methodologies (/training plan structure/)
│   ├── FII-based progression systems
│   ├── Daniel Koval's standard warm-up protocols
│   ├── Competition vs training differentiation
│   └── Tier-based athlete development
│
├── 🌊 Equalization Mastery (/Equalization/)
│   ├── Mouthfill techniques and troubleshooting
│   ├── Reverse packing progressions
│   ├── Frenzel vs Valsalva methodologies
│   └── Level-specific EQ protocols
│
├── 🧠 Fundamentals (/fundamentals/)
│   ├── Core freediving principles
│   ├── Breath-hold physiology
│   └── Mental preparation techniques
│
├── 🎯 Specialized Training
│   ├── /meditation/ - Mental training & visualization
│   ├── /mdr/ - Mammalian dive response optimization
│   ├── /npd/ - Negative pressure dive protocols
│   ├── /physics/ - Underwater physics & pressure effects
│   └── /equipment/ - Gear selection & usage
```

### Dynamic Knowledge Evolution Strategy

The Pinecone knowledge base is designed as a **living, continuously expanding system** that grows smarter through systematic knowledge updates and real-world feedback analysis.

#### Knowledge Expansion Pipeline

```typescript
// Continuous Knowledge Enhancement Process
┌─────────────────────────────────────────────────────────────┐
│                 KNOWLEDGE INPUT SOURCES                     │
├─────────────────────────────────────────────────────────────┤
│  Expert Curation     │  Research Updates  │  User Analytics │
│  - Daniel's insights │  - Latest studies  │  - Dive patterns │
│  - FII methodologies │  - Safety research │  - Common issues │
│  - Guest experts     │  - Equipment tests │  - Success rates │
└─────────────────┬───────────────────────────────┬───────────┘
                  │                               │
┌─────────────────▼───────────────────────────────▼───────────┐
│                KNOWLEDGE PROCESSING                         │
├─────────────────────────────────────────────────────────────┤
│  Content Validation   │  Embedding Generation │  Metadata   │
│  - Expert review      │  - text-embedding-3   │  - Categories│
│  - Safety verification│  - Semantic chunking  │  - Difficulty│
│  - Methodology check  │  - Context windows    │  - Priority  │
└─────────────────┬───────────────────────────────┬───────────┘
                  │                               │
┌─────────────────▼───────────────────────────────▼───────────┐
│                PINECONE OPTIMIZATION                        │
├─────────────────────────────────────────────────────────────┤
│  Namespace Strategy   │  Vector Tuning      │  Query Optimization│
│  - Domain-based       │  - Similarity tuning│  - Relevance scoring│
│  - Level-gated        │  - Context ranking  │  - Multi-query logic│
│  - Version control    │  - Embedding quality│  - Response filtering│
└─────────────────────────────────────────────────────────────┘
```

#### Knowledge Update Categories

**🔄 Continuous Updates (Weekly/Monthly)**
```typescript
// Real-time knowledge enhancement based on user data
interface KnowledgeUpdate {
  category: 'safety_pattern' | 'technique_refinement' | 'equipment_update';
  source: 'user_analytics' | 'expert_review' | 'research_findings';
  priority: 'critical' | 'high' | 'medium' | 'low';
  validation_required: boolean;
}

// Example: New safety pattern detected
const safetyUpdate: KnowledgeUpdate = {
  category: 'safety_pattern',
  source: 'user_analytics',
  priority: 'critical',
  validation_required: true,
  data: {
    pattern: 'Increased LMC incidents at 25-30m with specific equipment combo',
    recommendation: 'Add equipment-specific safety warnings for depth range',
    affected_knowledge_sections: ['Safety', 'equipment', 'enclose']
  }
};
```

**📚 Major Knowledge Additions (Quarterly)**

*Phase 1 Expansions (Next 3 months):*
- **Advanced Competition Protocols**: AIDA/CMAS competition rules and techniques
- **Environmental Specialization**: Cold water, altitude, different water conditions
- **Medical Integration**: Pre-existing conditions, contraindications, health monitoring
- **Instructor Certification**: Teaching methodologies, student assessment frameworks

*Phase 2 Expansions (3-6 months):*
- **Technology Integration**: Dive computer data analysis, wearable device insights
- **Regional Adaptation**: Local diving conditions, cultural diving practices
- **Advanced Rescue**: Technical rescue scenarios, medical emergency protocols
- **Research Integration**: Latest freediving studies, physiological discoveries

*Phase 3 Expansions (6-12 months):*
- **AI-Discovered Patterns**: Machine learning insights from user dive data
- **Predictive Analytics**: Risk prediction models, performance forecasting
- **Community Knowledge**: Peer learning, shared experiences, crowd-sourced insights
- **Personalization Frameworks**: Individual adaptation algorithms, custom coaching

#### Knowledge Quality Assurance Framework

```typescript
// Multi-tier validation system
interface KnowledgeValidation {
  technical_review: {
    accuracy: boolean;
    sources_cited: boolean;
    methodology_sound: boolean;
  };
  expert_approval: {
    reviewer: string; // Daniel Koval, certified instructors
    approval_level: 'approved' | 'approved_with_notes' | 'revision_needed';
    notes: string;
  };
  safety_verification: {
    risk_assessment: 'safe' | 'caution' | 'advanced_only' | 'instructor_supervised';
    contradictions_check: boolean;
    level_appropriate: boolean;
  };
  user_testing: {
    pilot_group_size: number;
    feedback_score: number;
    effectiveness_rating: number;
    safety_incidents: number;
  };
}
```

#### Knowledge Versioning & Rollback Strategy

```typescript
// Knowledge base version control
interface KnowledgeVersion {
  version: string; // semantic versioning: major.minor.patch
  knowledge_domains: string[];
  changes: {
    added: KnowledgeChunk[];
    modified: KnowledgeChunk[];
    deprecated: KnowledgeChunk[];
  };
  validation_status: 'testing' | 'approved' | 'production';
  rollback_plan: RollbackStrategy;
}

// Example: Safety-critical update
const safetyUpdate: KnowledgeVersion = {
  version: '2.1.3',
  knowledge_domains: ['Safety', 'enclose'],
  changes: {
    added: [newBlackoutProtocol],
    modified: [updatedEQGuidelines],
    deprecated: [outdatedSafetyMetric]
  },
  validation_status: 'production',
  rollback_plan: {
    trigger_conditions: ['increased_incidents', 'user_feedback_negative'],
    rollback_target: '2.1.2',
    notification_protocol: 'immediate_alert'
  }
};
```

#### Real-time Knowledge Enhancement from User Data

```typescript
// Learning from dive analytics
export class KnowledgeEvolutionService {

  async analyzeUserPatterns(): Promise<KnowledgeInsight[]> {
    // 1. Identify common issue patterns
    const patterns = await this.identifyPatterns();

    // 2. Find knowledge gaps
    const gaps = await this.findKnowledgeGaps(patterns);

    // 3. Generate enhancement recommendations
    const recommendations = await this.generateEnhancements(gaps);

    return recommendations.filter(r => r.confidence > 0.8);
  }

  async updateKnowledgeBase(insights: KnowledgeInsight[]): Promise<void> {
    for (const insight of insights) {
      // Validate with experts before deployment
      if (insight.requires_expert_review) {
        await this.submitForReview(insight);
      } else {
        // Auto-deploy low-risk improvements
        await this.deployKnowledgeUpdate(insight);
      }
    }
  }
}
```

#### Knowledge Impact Measurement

```typescript
// Track knowledge effectiveness
interface KnowledgeMetrics {
  query_success_rate: number;      // % of queries returning relevant results
  user_satisfaction: number;       // User feedback on coaching quality
  safety_improvement: number;      // Reduction in reported incidents
  technique_progression: number;   // Improvement in user dive performance
  knowledge_coverage: number;      // % of user questions answerable
}

// Continuous optimization based on metrics
const optimizationTargets = {
  query_success_rate: 0.95,        // 95% relevant results
  user_satisfaction: 4.5,          // 4.5/5 stars average
  safety_improvement: 0.15,        // 15% reduction in incidents
  technique_progression: 0.20,     // 20% improvement in user progression
  knowledge_coverage: 0.90         // 90% of questions answerable
};
```

#### Future Knowledge Architecture Enhancements

**Intelligent Knowledge Discovery**
- Automatic identification of knowledge gaps from user queries
- Trend analysis to predict future knowledge needs
- Cross-reference validation to ensure consistency

**Personalized Knowledge Delivery**
- User-specific knowledge filtering based on experience level
- Adaptive coaching based on individual progress patterns
- Dynamic safety warnings based on personal risk profiles

**Community-Driven Knowledge**
- Instructor contribution systems for specialized knowledge
- Peer validation networks for community-sourced content
- Regional knowledge chapters for location-specific information

**Research Integration Pipeline**
- Automated monitoring of freediving research publications
- Expert review workflow for incorporating new scientific findings
- Methodology validation against established FII standards

---

## 📊 Data Architecture Principles

### Single Source of Truth Pattern

```typescript
// Data Layer Hierarchy
┌─────────────────────────────────────────────────────────────┐
│         Supabase Database       │  ← Ultimate truth
├─────────────────────────────────────────────────────────────┤
│        Service Layer           │  ← Business logic
├─────────────────────────────────────────────────────────────┤
│         Cache Layer            │  ← Performance optimization
├─────────────────────────────────────────────────────────────┤
│       Component State          │  ← UI state only
└─────────────────────────────────────────────────────────────┘

// Never duplicate data logic
// ✅ GOOD
class DiveLogRepository {
  async save(diveLog: DiveLog) {
    const validated = this.validate(diveLog);
    const enriched = this.enrichWithMetadata(validated);
    return await supabase.from('dive_logs').insert(enriched);
  }
}

// ❌ BAD - Logic scattered across components
// Component A: validates differently than Component B
// API endpoint: has different validation rules
// Result: Data inconsistency
````

### Data Flow Architecture

```typescript
// Unidirectional Data Flow
User Action → Service Layer → Database → Cache Update → UI Update

// Example: Saving a dive log
SaveDiveLog(formData) {
  1. DiveLogService.validate(formData)     // Business rules
  2. DiveLogService.save(validData)       // Database update
  3. CacheService.invalidate('dive_logs') // Cache refresh
  4. EventBus.emit('dive_log_saved')      // Notify components
  5. UI.update(newState)                  // Re-render with fresh data
}
```

---

## 🔐 Security Architecture

### Multi-Layer Security Model

```typescript
// Security Perimeter Defense
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  Input Validation   │  XSS Prevention   │  CSRF Protection  │
│  - Sanitize inputs  │  - Escape outputs │  - Token validation│
└─────────────────┬───────────────────────────────┬───────────┘
                  │                               │
┌─────────────────▼───────────────────────────────▼───────────┐
│                      API LAYER                              │
├─────────────────────────────────────────────────────────────┤
│  Authentication     │  Authorization    │  Rate Limiting    │
│  - JWT validation   │  - Role checking  │  - Abuse prevention│
└─────────────────┬───────────────────────────────┬───────────┘
                  │                               │
┌─────────────────▼───────────────────────────────▼───────────┐
│                   DATABASE LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  Row Level Security │  Encryption       │  Audit Logging    │
│  - User isolation   │  - Data at rest   │  - Access tracking │
└─────────────────────────────────────────────────────────────┘
```

### Authentication Flow Consistency

```typescript
// Unified Auth Pattern (used by both routers)
export class AuthService {
  static async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  static async requireAuth(): Promise<User> {
    const user = await this.getCurrentUser();
    if (!user) throw new AuthError('Authentication required');
    return user;
  }
}

// Pages Router Usage
export async function getServerSideProps(context) {
  const user = await AuthService.requireAuth();
  return { props: { user } };
}

// App Router Usage
export default async function ProtectedPage() {
  const user = await AuthService.requireAuth();
  return <PageContent user={user} />;
}
```

---

## 🎨 UI/UX Consistency Framework

### Design System Architecture

```typescript
// Component Hierarchy & Consistency
┌─────────────────────────────────────────────────────────────┐
│                    DESIGN TOKENS                            │
├─────────────────────────────────────────────────────────────┤
│  Colors │ Typography │ Spacing │ Shadows │ Border Radius   │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                 PRIMITIVE COMPONENTS                        │
├─────────────────────────────────────────────────────────────┤
│  Button │ Input │ Card │ Modal │ Toast │ Loading Spinner   │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                COMPOSITE COMPONENTS                         │
├─────────────────────────────────────────────────────────────┤
│  DiveLogCard │ ChatMessage │ DashboardWidget │ NavBar      │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    PAGE LAYOUTS                             │
├─────────────────────────────────────────────────────────────┤
│  Dashboard │ ChatInterface │ DiveLogManager │ Settings     │
└─────────────────────────────────────────────────────────────┘
```

### Cross-Router UI Consistency

```tsx
// Shared Component Library (components/ui/)
export const Button = ({ variant, children, ...props }) => {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-colors";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]}`} {...props}>
      {children}
    </button>
  );
};

// Used consistently in both routers
// Pages Router: import { Button } from '@/components/ui/Button'
// App Router: import { Button } from '@/components/ui/Button'
```

---

## 🔄 State Management Philosophy

### State Ownership Principles

```typescript
// State Hierarchy (Most Specific → Most General)
┌─────────────────────────────────────────────────────────────┐
│                  COMPONENT STATE                            │
│  useState, useReducer - UI interactions, form inputs       │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                   SHARED STATE                              │
│  Context, Custom hooks - Cross-component communication     │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                  SERVER STATE                               │
│  SWR, React Query - Database sync, caching                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                 PERSISTENT STATE                            │
│  Database, LocalStorage - Long-term data storage           │
└─────────────────────────────────────────────────────────────┘
```

### State Management Patterns

```tsx
// ✅ GOOD - Clear state ownership
function DiveLogManager() {
  // Local UI state
  const [selectedLog, setSelectedLog] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Server state with caching
  const { data: diveLogs, mutate } = useSWR("/api/dive-logs", fetcher);

  // Shared context when needed
  const { user } = useAuth();

  const handleSave = async (logData) => {
    await saveDiveLog(logData);
    mutate(); // Refresh server state
    setIsEditing(false); // Update local state
  };
}

// ❌ BAD - State scattered everywhere
// Multiple components managing the same data
// No clear source of truth
// Synchronization nightmares
```

---

## 🚀 Performance Architecture

### Performance Budget Framework

```typescript
// Performance Targets
┌─────────────────────────────────────────────────────────────┐
│                   CORE WEB VITALS                           │
├─────────────────────────────────────────────────────────────┤
│  LCP (Largest Contentful Paint)    │  < 2.5s              │
│  FID (First Input Delay)            │  < 100ms             │
│  CLS (Cumulative Layout Shift)      │  < 0.1               │
│  TTFB (Time to First Byte)          │  < 600ms             │
└─────────────────────────────────────────────────────────────┘

// Bundle Size Targets
┌─────────────────────────────────────────────────────────────┐
│  Initial JS Bundle                  │  < 200KB (gzipped)   │
│  Total Page Weight                  │  < 1MB               │
│  Image Optimization                 │  WebP/AVIF           │
│  Font Loading                       │  font-display: swap  │
└─────────────────────────────────────────────────────────────┘
```

### Optimization Strategies

```tsx
// Code Splitting & Lazy Loading
const DiveLogAnalytics = lazy(() => import("./DiveLogAnalytics"));
const ChatInterface = lazy(() => import("./ChatInterface"));

// Memoization for expensive operations
const processedDiveData = useMemo(() => {
  return diveLogs.map((log) => ({
    ...log,
    analysis: analyzeDivePerformance(log),
  }));
}, [diveLogs]);

// Optimized data fetching
const { data, isLoading } = useSWR(`/api/dive-logs/${userId}`, fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000, // 1 minute
});
```

---

## 🎯 Feature Development Roadmap

### Phase 1: Foundation Stabilization (Current)

- [ ] Fix all build errors and warnings
- [ ] Ensure hybrid router stability
- [ ] Optimize core performance metrics
- [ ] Complete test coverage for critical paths

### Phase 2: AI Enhancement

- [ ] Implement advanced dive analysis
- [ ] Add personalized coaching algorithms
- [ ] Enhance safety prediction models
- [ ] Expand knowledge base content

### Phase 3: Community Features

- [ ] Instructor-student relationship management
- [ ] Dive buddy matching system
- [ ] Community challenges and achievements
- [ ] Social sharing and progress comparison

### Phase 4: Advanced Analytics

- [ ] Predictive safety analytics
- [ ] Performance trend analysis
- [ ] Personalized training plan generation
- [ ] Integration with dive computers and wearables

---

## 🔍 Quality Assurance Framework

### Code Quality Gates

```typescript
// Before any commit/deploy
┌─────────────────────────────────────────────────────────────┐
│                    QUALITY GATES                            │
├─────────────────────────────────────────────────────────────┤
│  ✅ All tests pass (unit, integration, e2e)                │
│  ✅ TypeScript compilation successful                       │
│  ✅ ESLint rules compliance                                 │
│  ✅ Build succeeds for both routers                         │
│  ✅ Performance budget maintained                           │
│  ✅ Security scan passes                                    │
│  ✅ Accessibility audit (WCAG 2.1 AA)                      │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Review Checklist

Before implementing any major feature:

- [ ] Does this align with our hybrid router strategy?
- [ ] Is this the minimum viable change to achieve the goal?
- [ ] Does this maintain consistency with existing patterns?
- [ ] Are we reusing existing components/services where possible?
- [ ] Does this follow our security architecture principles?
- [ ] Is this change testable and measurable?
- [ ] Does this improve or maintain performance metrics?

---

## 📈 Success Metrics & KPIs

### Technical Health Metrics

- **Build Success Rate**: > 99%
- **Test Coverage**: > 80% for critical paths
- **Performance Budget Compliance**: 100%
- **Security Scan Results**: Zero critical vulnerabilities
- **Code Quality Score**: > 8.5/10

### User Experience Metrics

- **Chat Response Time**: < 3 seconds
- **Dive Log Save Success**: > 99.5%
- **User Session Duration**: Trending upward
- **Feature Adoption Rate**: > 70% for new features
- **Error Rate**: < 0.1% of user actions

### Business Impact Metrics

- **User Retention**: > 85% monthly active users
- **Dive Log Entries**: Growing month over month
- **AI Coaching Engagement**: > 60% of users interact weekly
- **Safety Incident Reduction**: Measurable improvement in user-reported incidents

---

## 🔄 Continuous Evolution Principles

### Architectural Debt Management

1. **Identify**: Regular architecture reviews and debt assessment
2. **Prioritize**: Balance new features with technical debt reduction
3. **Plan**: Allocate 20% of development time to architectural improvements
4. **Execute**: Small, incremental improvements over big rewrites
5. **Measure**: Track technical debt metrics and architectural health

### Future-Proofing Strategies

- **Modular Design**: Keep components loosely coupled
- **API Versioning**: Design for backward compatibility
- **Progressive Enhancement**: Build core functionality first, enhance later
- **Technology Agnostic**: Abstract vendor-specific implementations
- **Data Portability**: Ensure user data can be migrated if needed

---

## 📞 Architectural Decision Process

### When to Make Architectural Changes

```typescript
// Decision Matrix
┌─────────────────────────────────────────────────────────────┐
│  Impact Level    │  Current State  │  Action Required       │
├─────────────────────────────────────────────────────────────┤
│  Critical        │  Broken         │  Immediate fix         │
│  High            │  Degraded       │  Plan & implement      │
│  Medium          │  Working        │  Add to roadmap        │
│  Low             │  Optimal        │  Monitor only          │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Change Protocol

1. **Document Current State**: What works, what doesn't
2. **Define Success Criteria**: Measurable outcomes
3. **Impact Assessment**: Risk analysis and mitigation strategies
4. **Implementation Plan**: Step-by-step approach with rollback plans
5. **Stakeholder Review**: Get alignment before major changes
6. **Incremental Rollout**: Test with small user groups first
7. **Monitor & Measure**: Track success metrics post-implementation

---

## 🎯 Final Words: Architectural North Star

**"Build a platform that freediving instructors trust and students love"**

Every architectural decision should be evaluated against this mission:

- Does this make the platform more trustworthy?
- Does this improve the student learning experience?
- Does this help instructors teach more effectively?
- Does this make freediving safer and more accessible?

When in doubt, choose:

- **Stability over novelty**
- **User value over technical elegance**
- **Incremental improvement over revolutionary change**
- **Proven patterns over experimental approaches**

---

_This architectural guide serves as the North Star for all development decisions. Reference it regularly and update it as we learn and grow._
