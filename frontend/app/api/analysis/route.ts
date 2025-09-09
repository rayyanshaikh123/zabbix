import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// Type definitions for better type safety
interface AnalysisRequest {
  device: string
  metric: string
  value: string | number
  severity: 'low' | 'medium' | 'high' | 'critical' | 'error' | 'warning' | 'info' | 'warn'
}

interface AnalysisResponse {
  rootCause: string
  immediateActions: string[]
  preventiveActions: string[]
  severity: string
  estimatedImpact: string
  estimatedTimeToFix: string
  hasIssue: boolean
}

interface UnifiedRequest {
  device: string;
  metric: string;
  value: string | number;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'error' | 'warning' | 'info' | 'warn';
  suggestion?: string;
  mode?: "analysis" | "troubleshoot";
}

/**
 * POST handler for AI-based network monitoring analysis
 * Expects JSON body: { device, metric, value, severity }
 */
export async function POST(req: NextRequest) {
  try {
    // Validate request body
    const body: UnifiedRequest = await req.json()
    const { device, metric, value, severity, suggestion, mode = "analysis" } = body

    // Input validation
    if (!device || !metric || value === undefined || !severity) {
      return NextResponse.json(
        { error: "Missing required fields: device, metric, value, severity" },
        { status: 400 }
      )
    }

    // Gemini API key
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAjNbu0b5T7BAWB9IYzKnKZFjqkhBOGhQ';
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 })
    }

    // Build prompt based on mode
    let prompt = "";
    if (mode === "troubleshoot") {
      prompt = `You are an expert network troubleshooter. Given the following data, respond ONLY in JSON (no markdown, no extra text):\n\nDevice: ${device}\nMetric: ${metric}\nCurrent Value: ${value}\nSeverity Level: ${severity}\nAutomated Suggestion: ${suggestion || "None"}\n\nInstructions: If the value is close to or above typical thresholds (e.g., above 80%), or if the metric is abnormal, always provide a root cause, actionable recommendations, and a summary. Do not return 'All Systems Normal' unless the value is clearly healthy.\n\nRequired JSON format:\n{\n  \"rootCause\": \"Brief technical explanation of the likely cause\",\n  \"immediateActions\": [\"Action 1\", \"Action 2\", \"Action 3\"],\n  \"troubleshootingSteps\": [\"Step 1\", \"Step 2\"],\n  \"preventionTips\": [\"Tip 1\", \"Tip 2\"],\n  \"relatedMetrics\": [\"related.metric1\", \"related.metric2\"],\n  \"severity\": \"${severity}\",\n  \"estimatedImpact\": \"Low/Medium/High/Critical\",\n  \"estimatedTimeToFix\": \"time estimate\",\n  \"hasIssue\": true/false,\n  \"summary\": \"One-sentence summary of the situation and recommendations\"\n}`;
    } else {
      prompt = `You are an expert network monitoring assistant. Analyze this network issue and respond ONLY in JSON (no markdown, no extra text):\n\nDevice: ${device}\nMetric: ${metric}\nCurrent Value: ${value}\nSeverity Level: ${severity}\n\nInstructions: If the value is close to or above typical thresholds (e.g., above 80%), or if the metric is abnormal, always provide a root cause, actionable recommendations, and a summary. Do not return 'All Systems Normal' unless the value is clearly healthy.\n\nRequired JSON format:\n{\n  \"rootCause\": \"Brief technical explanation of the likely cause\",\n  \"immediateActions\": [\"Action 1\", \"Action 2\", \"Action 3\"],\n  \"preventiveActions\": [\"Prevention 1\", \"Prevention 2\"],\n  \"severity\": \"${severity}\",\n  \"estimatedImpact\": \"Low/Medium/High/Critical\",\n  \"estimatedTimeToFix\": \"time estimate\",\n  \"hasIssue\": true/false,\n  \"summary\": \"One-sentence summary of the situation and recommendations\"\n}`;
    }

    // Log which mode is being used
    console.log(`[AI API] Mode: ${mode} | Device: ${device} | Metric: ${metric} | Severity: ${severity}`);

    // Call Gemini API
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GEMINI_API_KEY,
        },
      }
    )

    // Log the full Gemini API response for debugging
    console.log('[AI API] Gemini raw response:', response.data);

    // Log the full candidate content for debugging
    const candidateContent = response.data?.candidates?.[0]?.content;
    console.log('[AI API] Gemini candidate content:', candidateContent);

    // Try to extract text from candidateContent
    let aiText = '';
    if (candidateContent?.parts && Array.isArray(candidateContent.parts) && candidateContent.parts[0]?.text) {
      aiText = candidateContent.parts[0].text;
    } else if (typeof candidateContent?.text === 'string') {
      aiText = candidateContent.text;
    }
    // Try to parse JSON from AI text
    const jsonMatch = aiText.match(/\{[\s\S]*\}/)
    let analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: aiText }

    // Log the AI response for debugging
    console.log('[AI API] Response:', analysis);

    // Only use AI response, no static fallback
    return NextResponse.json(analysis)

  } catch (err: any) {
    console.error("Gemini API error:", err.response?.data ?? err.message)
    return NextResponse.json({ error: "Failed to generate analysis" }, { status: 500 })
  }
}

/**
 * Generate context-aware root cause analysis
 */
function generateRootCause(device: string, metric: string, value: string | number, severity: string): string {
  const metricLower = metric.toLowerCase()
  
  if (metricLower.includes('cpu')) {
    return `High CPU utilization (${value}) detected on ${device}. Possible causes: resource-intensive processes, insufficient hardware capacity, or system bottlenecks.`
  } else if (metricLower.includes('memory') || metricLower.includes('ram')) {
    return `Memory usage issue (${value}) on ${device}. Likely causes: memory leaks, insufficient RAM allocation, or high application demand.`
  } else if (metricLower.includes('disk')) {
    return `Disk space/performance issue (${value}) on ${device}. Potential causes: storage full, disk I/O bottleneck, or hardware failure.`
  } else if (metricLower.includes('network') || metricLower.includes('bandwidth')) {
    return `Network performance degradation (${value}) affecting ${device}. Possible causes: bandwidth saturation, network congestion, or connectivity issues.`
  } else if (metricLower.includes('temperature') || metricLower.includes('temp')) {
    return `Temperature anomaly (${value}) detected on ${device}. Causes may include: cooling system failure, environmental factors, or hardware stress.`
  } else {
    return `${metric} anomaly (${value}) detected on ${device}. Requires investigation to determine root cause based on device type and metric characteristics.`
  }
}

/**
 * Generate metric-specific immediate actions
 */
function generateImmediateActions(metric: string, severity: string): string[] {
  const metricLower = metric.toLowerCase()
  const baseActions = ["Check system logs", "Verify device connectivity"]
  
  if (metricLower.includes('cpu')) {
    return [...baseActions, "Identify high CPU processes", "Consider process termination if critical"]
  } else if (metricLower.includes('memory')) {
    return [...baseActions, "Check memory usage by process", "Restart memory-intensive applications"]
  } else if (metricLower.includes('disk')) {
    return [...baseActions, "Free up disk space", "Check disk health status"]
  } else if (metricLower.includes('network')) {
    return [...baseActions, "Test network connectivity", "Check for bandwidth bottlenecks"]
  } else {
    return [...baseActions, "Review metric thresholds", "Escalate to technical team if severe"]
  }
}

/**
 * Generate preventive actions
 */
function generatePreventiveActions(metric: string): string[] {
  const metricLower = metric.toLowerCase()
  
  if (metricLower.includes('cpu')) {
    return ["Implement CPU monitoring alerts", "Schedule regular performance reviews", "Consider hardware upgrades if recurring"]
  } else if (metricLower.includes('memory')) {
    return ["Set up memory usage alerts", "Implement automated memory cleanup", "Review application memory requirements"]
  } else if (metricLower.includes('disk')) {
    return ["Enable disk space monitoring", "Implement automated cleanup policies", "Schedule disk health checks"]
  } else if (metricLower.includes('network')) {
    return ["Deploy network monitoring tools", "Implement bandwidth management", "Review network architecture"]
  } else {
    return ["Enable proactive monitoring", "Schedule routine maintenance", "Document troubleshooting procedures"]
  }
}

/**
 * Map severity to impact level
 */
function getImpactLevel(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'error':
      return 'High'
    case 'high':
      return 'High'
    case 'medium':
    case 'warning':
    case 'warn':
      return 'Medium'
    case 'low':
    case 'info':
      return 'Low'
    default:
      return 'Medium'
  }
}

/**
 * Estimate time to fix based on severity
 */
function getTimeEstimate(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'Immediate (0-30 minutes)'
    case 'error':
    case 'high':
      return '1-2 hours'
    case 'medium':
    case 'warning':
    case 'warn':
      return '2-4 hours'
    case 'low':
    case 'info':
      return '4-24 hours'
    default:
      return '1-4 hours'
  }
}

/**
 * Validate analysis structure
 */
function isValidAnalysis(analysis: any): analysis is AnalysisResponse {
  return (
    analysis &&
    typeof analysis.rootCause === 'string' &&
    Array.isArray(analysis.immediateActions) &&
    Array.isArray(analysis.preventiveActions) &&
    typeof analysis.severity === 'string' &&
    typeof analysis.estimatedImpact === 'string' &&
    typeof analysis.estimatedTimeToFix === 'string' &&
    typeof analysis.hasIssue === 'boolean'
  )
}