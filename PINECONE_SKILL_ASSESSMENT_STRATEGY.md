# PINECONE SKILL ASSESSMENT & MODEL SELECTION STRATEGY

================================================================

## 🎯 PRIORITY: ACCURACY OVER COST FOR SAFETY-CRITICAL COACHING

KovalAI deals with life-safety in a high-risk sport. **Accuracy of knowledge retrieval is NON-NEGOTIABLE.**

## 📊 CURRENT PINECONE PERFORMANCE ANALYSIS

### ✅ **What's Working Well:**

- **Enhanced service** returns 8+ relevant chunks for skill queries
- **Index matching** provides canonical content priority
- **Fallback system** ensures no query goes unanswered
- **Processing time** ~8 seconds (acceptable for accuracy)
- **Knowledge coverage** includes FII certification levels, depth limits, techniques

### ⚠️ **Areas for Improvement:**

- **Skill level recognition** not integrated with dive log analysis
- **Contextual coaching** not adapted to user expertise level
- **Model selection** doesn't prioritize accuracy for safety-critical queries

## 🚀 IMPLEMENTATION STRATEGY

### **1. Hybrid Model Selection (Accuracy-First)**

```javascript
// Smart model selection based on query type and user limits
function selectOptimalModel(queryType, userTokenCount, userTier) {
  // SAFETY-CRITICAL QUERIES: Always use best model
  if (
    queryType === "safety" ||
    queryType === "certification" ||
    queryType === "technique"
  ) {
    return "gpt-4o"; // Best accuracy for safety
  }

  // HIGH-ACCURACY QUERIES: Use best available
  if (queryType === "coaching" || queryType === "skill_assessment") {
    if (userTokenCount < 100000 || userTier === "premium") {
      return "gpt-4o"; // Premium accuracy
    }
    return "o3-mini"; // Good accuracy, lower cost
  }

  // GENERAL QUERIES: Cost-efficient options
  if (userTokenCount > 500000) {
    return "o3-mini"; // Switch to efficient model after high usage
  }

  return "gpt-4o"; // Default to quality
}
```

### **2. Enhanced Skill Level Recognition**

```javascript
// Add to dive log analysis pipeline
function assessSkillLevel(diveMetrics, certificationData, diveHistory) {
  const assessment = {
    primaryLevel: "unknown",
    confidence: 0.0,
    indicators: [],
    coachingApproach: "conservative",
  };

  // Certification-based assessment (highest confidence)
  if (certificationData?.level) {
    assessment.primaryLevel = certificationData.level;
    assessment.confidence = 0.9;
    assessment.indicators.push(
      `Certified: ${certificationData.agency} ${certificationData.level}`
    );
  }

  // Dive log performance assessment
  if (diveMetrics?.max_depth) {
    const depth = diveMetrics.max_depth;

    if (depth > 50 && assessment.primaryLevel === "unknown") {
      assessment.primaryLevel = "elite";
      assessment.confidence = 0.7;
      assessment.indicators.push(`Elite performance: ${depth}m depth`);
    } else if (depth > 30 && assessment.primaryLevel === "unknown") {
      assessment.primaryLevel = "advanced";
      assessment.confidence = 0.6;
      assessment.indicators.push(`Advanced depth capability: ${depth}m`);
    }
  }

  // Set coaching approach
  assessment.coachingApproach = getCoachingApproach(assessment.primaryLevel);

  return assessment;
}
```

### **3. Skill-Aware Pinecone Querying**

```javascript
// Enhanced query with skill context
async function queryPineconeWithSkillContext(query, userSkillLevel) {
  const skillContext = getSkillContext(userSkillLevel);

  // Enhance query with skill-appropriate context
  const enhancedQuery = `${query} ${skillContext.searchTerms}`;

  const result = await queryPineconeWithIndex(enhancedQuery, {
    topK: 10,
    threshold: 0.4, // Higher threshold for accuracy
    confidence: 0.9, // Demand high confidence
    includeMetadata: true,
    filters: {
      skill_level: skillContext.allowedLevels, // Filter content by skill level
      safety_critical: true, // Prioritize safety content
    },
  });

  // Validate retrieved content matches user skill level
  const validatedChunks = validateContentForSkillLevel(
    result.chunks,
    userSkillLevel
  );

  return {
    ...result,
    chunks: validatedChunks,
    skillFiltered: true,
  };
}
```

## 🔧 IMMEDIATE IMPLEMENTATION PLAN

### **Phase 1: Prepare Training Data for Pinecone (NEXT)**

1. ✅ **Chunk the skill assessment document** into optimal segments
2. ✅ **Add skill level metadata** to each chunk
3. ✅ **Ingest into Pinecone** with proper vectorization
4. ✅ **Test retrieval accuracy** with skill-specific queries

### **Phase 2: Integrate Skill Recognition**

1. 🔧 **Add skill assessment** to dive log analysis pipeline
2. 🔧 **Modify coaching logic** to use skill-aware querying
3. 🔧 **Implement model selection** based on query criticality

### **Phase 3: Quality Assurance**

1. 🧪 **Test with real dive scenarios** (beginner 20m vs elite 80m)
2. 🧪 **Validate coaching responses** match skill level
3. 🧪 **Ensure safety compliance** (no advanced techniques for beginners)

## 💰 COST MANAGEMENT STRATEGY

### **Token Limits by User Type:**

- **Free Users:** 10,000 tokens/month → o3-mini after 5,000
- **Basic Users:** 50,000 tokens/month → o3-mini after 25,000
- **Premium Users:** 200,000 tokens/month → Always gpt-4o for safety queries
- **Professional Users:** Unlimited → Always best model

### **Query Classification:**

- **Safety-Critical:** certification limits, technique safety, emergency protocols
- **Coaching:** performance analysis, skill development, training plans
- **General:** casual questions, basic information

**RULE: Safety-critical queries ALWAYS use the best available model, regardless of cost.**

## 🎯 SUCCESS METRICS

### **Accuracy Targets:**

- **Skill Level Recognition:** 95% accuracy
- **Content Appropriateness:** 100% compliance (no advanced content for beginners)
- **Safety Compliance:** 100% (zero tolerance for unsafe advice)

### **Performance Targets:**

- **Response Time:** <10 seconds (acceptable for accuracy)
- **Chunk Relevance:** >0.8 similarity score
- **User Satisfaction:** Coaching feels appropriate to skill level

## 🚨 CRITICAL SAFETY REQUIREMENTS

1. **Never provide advanced techniques** (mouthfill, packing) to uncertified divers
2. **Always enforce certification depth limits** (FII L1: 20m, L2: 40m, L3: unlimited)
3. **Default to conservative coaching** when skill level is uncertain
4. **Validate all safety advice** against certified curriculum
5. **Provide clear warnings** before any advanced information

---

**NEXT ACTION: Implement Phase 1 - Prepare and ingest skill assessment training data into Pinecone with proper chunking and metadata.**
