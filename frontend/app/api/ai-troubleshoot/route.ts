import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

interface TroubleshootRequest {
  device: string;
  metric: string;
  value: string | number;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'error' | 'warning' | 'info' | 'warn';
  suggestion?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: TroubleshootRequest = await req.json();
    const { device, metric, value, severity, suggestion } = body;

    if (!device || !metric || value === undefined || !severity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Gemini API key
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
    }

    // Build troubleshooting prompt
    const prompt = `You are an expert network troubleshooter. Given the following data, respond ONLY in JSON (no markdown, no extra text):\n\nDevice: ${device}\nMetric: ${metric}\nCurrent Value: ${value}\nSeverity Level: ${severity}\nAutomated Suggestion: ${suggestion || "None"}\n\nRequired JSON format:\n{\n  "rootCause": "Brief technical explanation of the likely cause",\n  "immediateActions": ["Action 1", "Action 2", "Action 3"],\n  "troubleshootingSteps": ["Step 1", "Step 2"],\n  "preventionTips": ["Tip 1", "Tip 2"],\n  "relatedMetrics": ["related.metric1", "related.metric2"],\n  "severity": "${severity}",\n  "estimatedImpact": "Low/Medium/High/Critical",\n  "estimatedTimeToFix": "time estimate",\n  "hasIssue": true\n}`;

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
    );

    // Extract AI text
    const aiText = response.data?.candidates?.[0]?.content?.[0]?.text ?? "";
    // Try to parse JSON from AI text
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: aiText };

    return NextResponse.json(analysis);

  } catch (err: any) {
    console.error("Gemini API error:", err.response?.data ?? err.message);
    return NextResponse.json({ error: "Failed to generate troubleshooting" }, { status: 500 });
  }
}
