// Intelligent Coaching System - Contextual Tool Integration
import React, { useState, useEffect, useRef, useCallback } from 'react';

const IntelligentCoachingSystem = ({ messages, setMessages, darkMode }) => {
  const [activeContextualTools, setActiveContextualTools] = useState([]);
  const [processingTools, setProcessingTools] = useState(new Set());
  const processedMessages = useRef(new Set());

  // 🧠 Advanced conversation analysis with context awareness
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') return;
    
    // Prevent duplicate processing
    const messageKey = `${lastMessage.content}-${messages.length}`;
    if (processedMessages.current.has(messageKey)) return;
    processedMessages.current.add(messageKey);

    const content = lastMessage.content.toLowerCase();
    const triggeredTools = [];

    // 🎯 SMART EQ PLAN DETECTION
    const depthPatterns = [
      /(\d+)\s*m/g,                          // "40m", "50 m"
      /depth.*?(\d+)/g,                      // "depth of 45"
      /going.*?down.*?(\d+)/g,               // "going down to 35"
      /target.*?(\d+)/g,                     // "target 60"
      /aiming.*?for.*?(\d+)/g,               // "aiming for 70"
    ];

    for (const pattern of depthPatterns) {
      const matches = [...content.matchAll(pattern)];
      if (matches.length > 0) {
        const depths = matches.map(m => parseInt(m[1])).filter(d => d >= 10 && d <= 200);
        if (depths.length > 0) {
          const targetDepth = Math.max(...depths); // Use the deepest mentioned depth
          triggeredTools.push({
            type: 'eq-plan',
            data: { targetDepth, context: content },
            priority: 'high',
            confidence: 0.9
          });
          break;
        }
      }
    }

    // 🩺 SMART PROBLEM DETECTION (ENCLOSE)
    const problemIndicators = [
      'struggling', 'problem', 'issue', 'difficulty', 'trouble',
      'squeeze', 'pressure', 'pain', 'uncomfortable',
      'equalization', 'equaliz', 'eq failure', 'mouthfill',
      'can\'t', 'unable', 'blocked', 'stuck'
    ];

    const problemScore = problemIndicators.reduce((score, indicator) => {
      return score + (content.includes(indicator) ? 1 : 0);
    }, 0);

    if (problemScore >= 2) {
      triggeredTools.push({
        type: 'enclose-diagnostic',
        data: { 
          symptoms: extractAdvancedSymptoms(content),
          severity: problemScore >= 4 ? 'high' : 'medium',
          context: content
        },
        priority: 'critical',
        confidence: Math.min(problemScore / 4, 1.0)
      });
    }

    // 💨 MOUTHFILL ADVISOR TRIGGERS
    const mouthfillKeywords = ['mouthfill', 'reverse pack', 'rv', 'packing', 'buccal'];
    if (mouthfillKeywords.some(keyword => content.includes(keyword))) {
      triggeredTools.push({
        type: 'mouthfill-advisor',
        data: { 
          context: content,
          experience: extractExperienceLevel(content, messages)
        },
        priority: 'medium',
        confidence: 0.8
      });
    }

    // 🛡️ SAFETY PROTOCOL TRIGGERS
    const safetyKeywords = ['safety', 'risk', 'dangerous', 'scared', 'nervous', 'first time'];
    const diveKeywords = ['dive', 'diving', 'session', 'training'];
    
    if (safetyKeywords.some(s => content.includes(s)) && 
        diveKeywords.some(d => content.includes(d))) {
      triggeredTools.push({
        type: 'safety-checklist',
        data: { 
          diveType: extractDiveType(content),
          urgency: content.includes('scared') || content.includes('dangerous') ? 'high' : 'medium'
        },
        priority: 'critical',
        confidence: 0.85
      });
    }

    // 📅 TRAINING PLAN TRIGGERS
    const planningKeywords = ['plan', 'training', 'progression', 'schedule', 'program', 'routine'];
    const futureKeywords = ['next', 'improve', 'better', 'progress', 'goal'];
    
    if (planningKeywords.some(p => content.includes(p)) && 
        futureKeywords.some(f => content.includes(f))) {
      triggeredTools.push({
        type: 'training-plan',
        data: { 
          currentLevel: extractCurrentLevel(content),
          goals: extractGoals(content)
        },
        priority: 'medium',
        confidence: 0.7
      });
    }

    setActiveContextualTools(triggeredTools);
  }, [messages]);

  // 🚀 AUTO-EXECUTE HIGH PRIORITY TOOLS WITH NATURAL LANGUAGE INJECTION
  const handleEQPlanTool = useCallback(async (tool) => {
    const response = await fetch('/api/coach/eq-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        targetDepth: tool.data.targetDepth,
        userLevel: extractExperienceLevel(tool.data.context, messages)
        // Note: maxReversePack not provided - API will ask for it
      })
    });

    if (response.ok) {
      const result = await response.json();
      
      // Handle case where reverse pack depth is needed
      if (result.requiresInfo) {
        const naturalResponse = `For your ${tool.data.targetDepth}m dive, I need to know something important first:\n\n` +
          `**${result.guidance}**\n\n` +
          `This is crucial because your mouthfill depth should be 5-10m shallower than your maximum reverse pack depth. ` +
          `If you haven't tested this yet, here's how:\n\n` +
          `📋 **Reverse Pack Test Protocol:**\n` +
          `${result.testProtocol.instructions.join('\n')}\n\n` +
          `Once you know your max reverse pack depth, I can give you a precise EQ plan with optimal mouthfill timing!`;

        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: naturalResponse,
            metadata: { 
              toolUsed: 'eq-plan-inquiry', 
              automated: true, 
              requiresUserInfo: true,
              targetDepth: tool.data.targetDepth
            }
          }]);
        }, 800);
      } else {
        // Handle successful EQ plan with reverse pack data
        const plan = result.eqPlan;
        const naturalResponse = `Perfect! For your ${tool.data.targetDepth}m dive, based on your reverse pack capability:\n\n` +
          `🎯 **Mouthfill timing**: Take ${plan.volumeRecommendation.size} at ${plan.mouthfillDepth}m\n` +
          `⚡ **EQ rhythm**: Plan for ${plan.totalEQCount} total equalizations\n` +
          `🛡️ **Safety margin**: ${plan.safetyMargin}m buffer above theoretical max\n\n` +
          `${plan.notes.slice(0, 3).join('\n')}\n\n` +
          `This follows your exact reverse pack depth of ${plan.maxReversePack}m. Remember: technique > depth!`;

        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: naturalResponse,
            metadata: { 
              toolUsed: 'eq-plan', 
              automated: true, 
              confidence: tool.confidence,
              targetDepth: tool.data.targetDepth
            }
          }]);
        }, 800);
      }
    }
  }, [messages, setMessages]);

  const handleENCLOSETool = useCallback(async (tool) => {
    const response = await fetch('/api/coach/enclose-diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        symptoms: tool.data.symptoms,
        severity: tool.data.severity,
        context: tool.data.context
      })
    });

    if (response.ok) {
      const diagnosis = await response.json();
      
      const naturalResponse = `I can help you work through this systematically. Looking at what you've described, ` +
        `this sounds like it's primarily related to ${diagnosis.primaryCategory.toLowerCase()}.\n\n` +
        `Here's my recommendation:\n\n` +
        `${diagnosis.recommendations.slice(0, 3).join('\n\n')}\n\n` +
        `Let's start with the first step and see how that feels. What's your experience been like with this issue?`;

      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: naturalResponse,
          metadata: { 
            toolUsed: 'enclose-diagnostic', 
            automated: true,
            category: diagnosis.primaryCategory,
            severity: tool.data.severity
          }
        }]);
      }, 1200);
    }
  }, [setMessages]);

  const handleMouthfillTool = useCallback(async (tool) => {
    // Provide contextual mouthfill advice based on experience level
    const advice = getMouthfillAdvice(tool.data.experience);
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: advice,
        metadata: { 
          toolUsed: 'mouthfill-advisor', 
          automated: true,
          experience: tool.data.experience
        }
      }]);
    }, 600);
  }, [setMessages]);

  const handleSafetyTool = useCallback(async (tool) => {
    const safetyAdvice = getSafetyAdvice(tool.data.diveType, tool.data.urgency);
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: safetyAdvice,
        metadata: { 
          toolUsed: 'safety-checklist', 
          automated: true,
          urgency: tool.data.urgency
        }
      }]);
    }, 400);
  }, [setMessages]);

  const handleTrainingPlanTool = useCallback(async (tool) => {
    const planAdvice = getTrainingPlanAdvice(tool.data.currentLevel, tool.data.goals);
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: planAdvice,
        metadata: { 
          toolUsed: 'training-plan', 
          automated: true,
          level: tool.data.currentLevel
        }
      }]);
    }, 1000);
  }, [setMessages]);

  const executeCoachingTool = useCallback(async (tool) => {
    try {
      switch (tool.type) {
        case 'eq-plan':
          await handleEQPlanTool(tool);
          break;
        case 'enclose-diagnostic':
          await handleENCLOSETool(tool);
          break;
        case 'mouthfill-advisor':
          await handleMouthfillTool(tool);
          break;
        case 'safety-checklist':
          await handleSafetyTool(tool);
          break;
        case 'training-plan':
          await handleTrainingPlanTool(tool);
          break;
      }
    } catch (error) {
      console.error(`Error executing ${tool.type}:`, error);
    }
  }, [handleEQPlanTool, handleENCLOSETool, handleMouthfillTool, handleSafetyTool, handleTrainingPlanTool]);

  useEffect(() => {
    const executeTools = async () => {
      const highPriorityTools = activeContextualTools.filter(
        tool => tool.priority === 'critical' || (tool.priority === 'high' && tool.confidence > 0.8)
      );

      for (const tool of highPriorityTools) {
        // Prevent duplicate execution
        const toolKey = `${tool.type}-${JSON.stringify(tool.data)}`;
        if (processingTools.has(toolKey)) continue;
        
        setProcessingTools(prev => new Set([...prev, toolKey]));

        try {
          await executeCoachingTool(tool);
        } catch (error) {
          console.error(`Failed to execute ${tool.type}:`, error);
        } finally {
          setProcessingTools(prev => {
            const newSet = new Set(prev);
            newSet.delete(toolKey);
            return newSet;
          });
        }
      }
    };

    if (activeContextualTools.length > 0) {
      executeTools();
    }
  }, [activeContextualTools, executeCoachingTool, processingTools]);

  // 🔍 ADVANCED CONTEXT EXTRACTION FUNCTIONS
  const extractAdvancedSymptoms = (content) => {
    const symptoms = [];
    const symptomMap = {
      'squeeze': ['squeeze', 'pressure', 'pain', 'uncomfortable'],
      'equalization_issues': ['equalization', 'equaliz', 'eq failure', 'blocked'],
      'mouthfill_problems': ['mouthfill', 'reverse pack', 'packing'],
      'co2_tolerance': ['contractions', 'urge to breathe', 'co2'],
      'o2_conservation': ['blackout', 'tunnel vision', 'stars'],
      'technique': ['form', 'technique', 'streamlining']
    };

    for (const [symptom, keywords] of Object.entries(symptomMap)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        symptoms.push(symptom);
      }
    }
    
    return symptoms;
  };

  const extractExperienceLevel = (content, messages) => {
    const beginnerKeywords = ['beginner', 'new', 'first time', 'just started'];
    const advancedKeywords = ['advanced', 'experienced', 'instructor', 'competing'];
    
    if (beginnerKeywords.some(k => content.includes(k))) return 'beginner';
    if (advancedKeywords.some(k => content.includes(k))) return 'advanced';
    
    // Analyze message history for experience level
    const totalMessages = messages.filter(m => m.role === 'user').length;
    return totalMessages > 10 ? 'intermediate' : 'beginner';
  };

  const extractDiveType = (content) => {
    if (content.includes('pool') || content.includes('sta') || content.includes('dyn')) return 'pool';
    if (content.includes('depth') || content.includes('cwt') || content.includes('fim')) return 'depth';
    return 'general';
  };

  const extractCurrentLevel = (content) => {
    const depthMatch = content.match(/current.*?(\d+).*?m/i) || content.match(/pb.*?(\d+)/i);
    if (depthMatch) return `${depthMatch[1]}m`;
    return 'unknown';
  };

  const extractGoals = (content) => {
    const goalMatch = content.match(/goal.*?(\d+).*?m/i) || content.match(/want.*?(\d+)/i);
    if (goalMatch) return [`${goalMatch[1]}m depth`];
    return ['general improvement'];
  };

  // 📚 ADVICE GENERATION FUNCTIONS
  const getMouthfillAdvice = (experience) => {
    if (experience === 'beginner') {
      return `For mouthfill technique, let's start with the fundamentals:\n\n` +
        `🎯 **Start small**: Begin with ¼ mouthfill (grape-sized) at around 35-40m\n` +
        `💨 **Technique**: Use your tongue to create the pocket, not forceful packing\n` +
        `⏱️ **Timing**: Practice the reverse pack motion on land first\n\n` +
        `The key is smooth, controlled movement. Never force it - that leads to problems.`;
    }
    
    return `For mouthfill optimization:\n\n` +
      `🎯 **Volume calculation**: Your depth × 2.5ml = optimal mouthfill size\n` +
      `📍 **Depth timing**: Start your reverse pack 5-8m before residual volume\n` +
      `🔄 **Practice progression**: Land → shallow water → working depth\n\n` +
      `Remember: smooth and controlled beats big and forceful every time.`;
  };

  const getSafetyAdvice = (diveType, urgency) => {
    if (urgency === 'high') {
      return `⚠️ **Safety is always the priority.** Let's address your concerns:\n\n` +
        `🛡️ **Never dive alone** - always have a qualified buddy\n` +
        `📊 **Conservative progression** - advance in 2-3m increments only\n` +
        `⏱️ **Extended surface intervals** - minimum 2:1 ratio (surface:dive time)\n\n` +
        `If you're feeling uncertain, that's your body telling you something important. Trust that instinct.`;
    }
    
    return `Here's your safety checklist for ${diveType} diving:\n\n` +
      `✅ **C.L.E.A.R. protocol** completed before each dive\n` +
      `✅ **Proper warm-up** and mental preparation\n` +
      `✅ **Emergency protocols** reviewed with your buddy\n\n` +
      `Safety isn't just about equipment - it's about being mentally and physically prepared.`;
  };

  const getTrainingPlanAdvice = (currentLevel, goals) => {
    return `Let's create a smart progression plan:\n\n` +
      `📊 **Current assessment**: Starting from ${currentLevel}\n` +
      `🎯 **Goal focus**: ${goals.join(', ')}\n` +
      `📅 **Recommended structure**:\n` +
      `   • 2x pool sessions (technique & breath hold)\n` +
      `   • 1x depth session (conservative progression)\n` +
      `   • 1x dry training (flexibility & mental)\n\n` +
      `The key is consistency over intensity. Small, regular improvements compound quickly.`;
  };

  // 🎨 RENDER DEVELOPMENT INDICATOR (INVISIBLE IN PRODUCTION)
  const renderDevIndicator = () => {
    if (process.env.NODE_ENV !== 'development' || activeContextualTools.length === 0) return null;

    return (
      <div className={`fixed bottom-20 right-4 p-3 rounded-lg text-xs border max-w-xs ${
        darkMode ? 'bg-gray-800 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-600 border-gray-300'
      }`}>
        <div className="font-semibold mb-1">🧠 AI Analysis Active</div>
        {activeContextualTools.map((tool, i) => (
          <div key={i} className="flex justify-between">
            <span>{tool.type}</span>
            <span className={`ml-2 ${tool.priority === 'critical' ? 'text-red-400' : tool.priority === 'high' ? 'text-yellow-400' : 'text-green-400'}`}>
              {Math.round(tool.confidence * 100)}%
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {renderDevIndicator()}
    </>
  );
};
export default IntelligentCoachingSystem;
