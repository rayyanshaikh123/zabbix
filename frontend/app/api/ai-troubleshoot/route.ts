import { NextRequest, NextResponse } from 'next/server'

interface TroubleshootRequest {
  device: string
  metric: string
  value: any
  suggestion: string
  severity: 'info' | 'warn' | 'error'
}

export async function POST(request: NextRequest) {
  try {
    const body: TroubleshootRequest = await request.json()
    const { device, metric, value, suggestion, severity } = body

    if (!device || !metric) {
      return NextResponse.json(
        { success: false, error: 'Device and metric are required' },
        { status: 400 }
      )
    }

    // First, determine if this is actually an issue that needs troubleshooting
    const isActualIssue = determineIfIssueExists(metric, value, severity)
    
    if (!isActualIssue) {
      return NextResponse.json({
        success: true,
        solution: {
          hasIssue: false,
          message: `No issues detected. ${device} is operating normally with ${metric} at ${value}.`,
          severity: severity,
          status: "healthy"
        },
        source: 'analysis'
      })
    }

    // Create a dynamic, issue-specific prompt for the AI
    const prompt = `You are a senior network infrastructure expert. Analyze this specific issue and provide ONLY the relevant troubleshooting information.

**ISSUE DETAILS:**
- Device: ${device}
- Metric: ${metric}
- Current Value: ${value}
- Severity: ${severity}
- Context: ${suggestion}

**ANALYSIS REQUIREMENTS:**
Based on the severity level and metric type, provide ONLY the sections that are relevant to this specific issue:

${severity === 'error' ? `
**CRITICAL ISSUE DETECTED** - Provide:
1. Root cause analysis
2. Immediate emergency actions
3. Critical troubleshooting steps
4. Recovery procedures
` : severity === 'warn' ? `
**WARNING CONDITION** - Provide:
1. Potential root cause
2. Investigation steps
3. Preventive actions
` : `
**INFORMATIONAL ANALYSIS** - Provide:
1. Current status explanation
2. Monitoring recommendations
`}

**RESPONSE FORMAT:**
Return ONLY a JSON object with relevant sections (omit sections that don't apply):
{
  ${severity === 'error' ? `
  "rootCause": "Specific technical explanation of the critical issue",
  "immediateActions": ["Emergency action 1", "Emergency action 2"],
  "troubleshootingSteps": [
    {"step": 1, "action": "specific command", "description": "purpose"},
    {"step": 2, "action": "specific command", "description": "purpose"}
  ],
  "recoveryProcedures": ["Recovery step 1", "Recovery step 2"],
  ` : severity === 'warn' ? `
  "potentialCause": "Likely cause of the warning condition",
  "investigationSteps": [
    {"step": 1, "action": "investigation command", "description": "purpose"},
    {"step": 2, "action": "investigation command", "description": "purpose"}
  ],
  "preventiveActions": ["Prevention measure 1", "Prevention measure 2"],
  ` : `
  "statusExplanation": "Explanation of current status and what it means",
  "monitoringRecommendations": ["Monitor metric 1", "Monitor metric 2"],
  `}
  "severity": "${severity}",
  "estimatedImpact": "Low/Medium/High/Critical",
  "estimatedTimeToFix": "X minutes/hours",
  "hasIssue": true
}

**IMPORTANT:**
- Only include sections relevant to the severity level
- Be specific to this exact metric and value
- Don't provide generic troubleshooting for non-issues
- Focus on actionable, specific solutions`

    // Call Hugging Face API
    const huggingFaceResponse = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_length: 1000,
            temperature: 0.7,
            return_full_text: false
          }
        })
      }
    )

    if (!huggingFaceResponse.ok) {
      // Fallback to a rule-based system if Hugging Face fails
      const fallbackSolution = generateFallbackSolution(device, metric, value, severity, suggestion)
      return NextResponse.json({
        success: true,
        solution: fallbackSolution,
        source: 'fallback'
      })
    }

    const aiResponse = await huggingFaceResponse.json()
    
    // Try to parse the AI response as JSON, fallback to text if it fails
    let solution
    try {
      solution = JSON.parse(aiResponse[0]?.generated_text || '{}')
    } catch {
      // If AI response is not valid JSON, create a structured response
      solution = {
        rootCause: aiResponse[0]?.generated_text || "Unable to analyze with AI",
        immediateActions: ["Check device connectivity", "Verify configuration", "Review logs"],
        troubleshootingSteps: [
          { step: 1, action: "ping " + device, description: "Test basic connectivity" },
          { step: 2, action: "show interfaces", description: "Check interface status" }
        ],
        prevention: ["Regular monitoring", "Proactive maintenance"],
        relatedMetrics: ["interface_status", "cpu_usage", "memory_usage"],
        severity: severity,
        estimatedImpact: "Medium",
        estimatedTimeToFix: "15-30 minutes"
      }
    }

    return NextResponse.json({
      success: true,
      solution,
      source: 'ai'
    })

  } catch (error) {
    console.error('Error in AI troubleshoot:', error)
    
    // Return fallback solution on any error
    const body = await request.json().catch(() => ({}))
    const fallbackSolution = generateFallbackSolution(
      body.device || 'Unknown',
      body.metric || 'Unknown',
      body.value || 'Unknown',
      body.severity || 'warn',
      body.suggestion || 'No suggestion available'
    )
    
    return NextResponse.json({
      success: true,
      solution: fallbackSolution,
      source: 'fallback'
    })
  }
}

function determineIfIssueExists(metric: string, value: any, severity: string): boolean {
  // Determine if this is actually an issue that needs troubleshooting
  const numericValue = parseFloat(value.toString().replace('%', ''))
  
  // Always show analysis for errors
  if (severity === 'error') {
    return true
  }
  
  // Check for specific problematic values regardless of severity
  if (metric.includes('cpu') || metric.includes('CPU')) {
    return numericValue > 80 // High CPU usage is always an issue
  }
  
  if (metric.includes('memory') || metric.includes('Memory')) {
    return numericValue > 75 // High memory usage is always an issue
  }
  
  if (metric.includes('uptime') || metric.includes('Uptime') || metric.includes('stability')) {
    return numericValue < 50 // Low uptime/stability is always an issue
  }
  
  if (metric.includes('health.overall') || metric.includes('health')) {
    // For health metrics, check if there are underlying issues
    if (metric.includes('device.health')) {
      // Device health should be analyzed if there are performance issues
      return numericValue < 90 // Device health below 90% needs analysis
    }
    if (metric.includes('office.health')) {
      return numericValue < 80 // Office health below 80% needs analysis
    }
  }
  
  // For warnings, always show analysis
  if (severity === 'warn') {
    return true
  }
  
  // For info level, only show analysis if there are specific problematic conditions
  if (severity === 'info') {
    // Check for high utilization metrics
    if (metric.includes('util') || metric.includes('usage')) {
      return numericValue > 70 // High utilization needs analysis
    }
    
    // Check for low performance metrics
    if (metric.includes('performance') || metric.includes('efficiency')) {
      return numericValue < 60 // Low performance needs analysis
    }
    
    // Check for connectivity issues
    if (metric.includes('connectivity') || metric.includes('link')) {
      return numericValue < 80 // Poor connectivity needs analysis
    }
  }
  
  return false
}

function generateFallbackSolution(device: string, metric: string, value: any, severity: string, suggestion: string) {
  // Check if this is actually an issue
  if (!determineIfIssueExists(metric, value, severity)) {
    return {
      hasIssue: false,
      message: `No issues detected. ${device} is operating normally with ${metric} at ${value}.`,
      severity: severity,
      status: "healthy"
    }
  }

  // Enhanced rule-based fallback system with dynamic, issue-specific solutions
  const solutions: { [key: string]: any } = {
    // Device health analysis - Dynamic based on severity and underlying issues
    'device.health.overall': (() => {
      const healthScore = parseInt(value.toString().replace('%', ''))
      
      // Check for underlying performance issues that might not be reflected in overall health
      const hasPerformanceIssues = healthScore < 90 || severity === 'warn' || severity === 'error'
      
      if (severity === 'error' || healthScore < 60) {
        return {
          rootCause: `CRITICAL: Device health is critically low at ${value}. This indicates severe performance issues, potential hardware failures, or system instability.`,
          immediateActions: [
            "Immediate device status assessment",
            "Check for hardware failures or overheating",
            "Verify power supply and environmental conditions",
            "Check system logs for critical errors"
          ],
          troubleshootingSteps: [
            { step: 1, action: "show version", description: "Check device information and uptime" },
            { step: 2, action: "show processes cpu", description: "Identify high CPU usage processes" },
            { step: 3, action: "show memory", description: "Check memory utilization and allocation" },
            { step: 4, action: "show logging", description: "Review recent error messages and alerts" },
            { step: 5, action: "show environment", description: "Check temperature and power status" }
          ],
          recoveryProcedures: [
            "Restart critical services",
            "Clear memory buffers if needed",
            "Check and replace faulty hardware",
            "Implement emergency cooling if overheating"
          ],
          severity: severity,
          estimatedImpact: "Critical",
          estimatedTimeToFix: "1-3 hours",
          hasIssue: true
        }
      } else if (hasPerformanceIssues) {
        return {
          potentialCause: `Device health is degraded at ${value}. This suggests underlying performance issues such as high CPU/memory usage, network problems, or system instability.`,
          investigationSteps: [
            { step: 1, action: "show processes cpu", description: "Check CPU usage by process to identify bottlenecks" },
            { step: 2, action: "show memory", description: "Analyze memory utilization and identify memory leaks" },
            { step: 3, action: "show interfaces", description: "Check interface status and traffic patterns" },
            { step: 4, action: "show logging | include error", description: "Look for error messages and warnings" }
          ],
          preventiveActions: [
            "Optimize high CPU/memory processes",
            "Implement memory management improvements",
            "Schedule regular maintenance windows",
            "Set up proactive monitoring alerts"
          ],
          severity: severity,
          estimatedImpact: "Medium",
          estimatedTimeToFix: "30-90 minutes",
          hasIssue: true
        }
      } else {
        return {
          statusExplanation: `Device health is good at ${value}. All systems are operating normally.`,
          monitoringRecommendations: [
            "Continue regular health monitoring",
            "Monitor CPU and memory trends",
            "Watch for any performance degradation"
          ],
          severity: severity,
          estimatedImpact: "Low",
          estimatedTimeToFix: "No action needed",
          hasIssue: false
        }
      }
    })(),
    // Office-level health analysis - Dynamic based on severity
    'office.health.overall': (() => {
      const healthScore = parseInt(value.toString().replace('%', ''))
      
      if (severity === 'error' || healthScore < 50) {
        return {
          rootCause: `CRITICAL: Office health is critically low at ${value}. Multiple systems are likely failing or offline.`,
          immediateActions: [
            "Emergency assessment of all critical systems",
            "Check power and environmental conditions",
            "Verify network connectivity to all devices",
            "Notify stakeholders of critical status"
          ],
          troubleshootingSteps: [
            { step: 1, action: "Emergency device inventory", description: "Immediately check status of all critical devices" },
            { step: 2, action: "Power and environmental check", description: "Verify power supply and environmental conditions" },
            { step: 3, action: "Network connectivity test", description: "Test connectivity to all office devices" },
            { step: 4, action: "Service recovery procedures", description: "Execute emergency service recovery" }
          ],
          recoveryProcedures: [
            "Restore critical services first",
            "Reboot failed devices",
            "Check and replace faulty hardware",
            "Verify all systems are operational"
          ],
          severity: severity,
          estimatedImpact: "Critical",
          estimatedTimeToFix: "1-3 hours",
          hasIssue: true
        }
      } else if (severity === 'warn' || healthScore < 70) {
        return {
          potentialCause: `Office health is degraded at ${value}. Some devices or services may be experiencing issues.`,
          investigationSteps: [
            { step: 1, action: "Device health review", description: "Check individual device health and performance" },
            { step: 2, action: "Performance analysis", description: "Analyze performance trends and identify issues" },
            { step: 3, action: "Connectivity verification", description: "Test network connectivity and identify problems" }
          ],
          preventiveActions: [
            "Address identified device issues",
            "Optimize network performance",
            "Implement proactive monitoring",
            "Schedule maintenance for problematic devices"
          ],
          severity: severity,
          estimatedImpact: "Medium",
          estimatedTimeToFix: "30-90 minutes",
          hasIssue: true
        }
      } else {
        return {
          statusExplanation: `Office health is good at ${value}. All systems are operating normally.`,
          monitoringRecommendations: [
            "Continue regular health monitoring",
            "Monitor for any performance degradation",
            "Maintain current monitoring thresholds"
          ],
          severity: severity,
          estimatedImpact: "Low",
          estimatedTimeToFix: "No action needed",
          hasIssue: false
        }
      }
    })(),
    'office.devices.status': {
      rootCause: `Device status analysis for ${device} office: ${value}. This indicates the overall health and connectivity status of devices within the office.`,
      immediateActions: [
        "Identify offline or problematic devices",
        "Check network connectivity issues",
        "Review device performance metrics",
        "Verify power and environmental conditions"
      ],
      troubleshootingSteps: [
        { step: 1, action: "Device inventory check", description: "List all devices and their current status" },
        { step: 2, action: "Connectivity testing", description: "Test network connectivity to each device" },
        { step: 3, action: "Performance analysis", description: "Check CPU, memory, and interface metrics" },
        { step: 4, action: "Environmental check", description: "Verify power, temperature, and physical conditions" },
        { step: 5, action: "Service verification", description: "Ensure critical services are running on devices" }
      ],
      prevention: [
        "Regular device health monitoring",
        "Proactive maintenance schedules",
        "Redundant connectivity options",
        "Environmental monitoring systems",
        "Device lifecycle management"
      ],
      relatedMetrics: ["device.status", "device.performance", "network.connectivity", "environmental.status"],
      severity: severity,
      estimatedImpact: severity === 'error' ? "High" : severity === 'warn' ? "Medium" : "Low",
      estimatedTimeToFix: severity === 'error' ? "1-2 hours" : "30-60 minutes"
    },
    'office.warnings.count': {
      rootCause: `Warning conditions detected in ${device} office: ${value}. Multiple devices or systems are showing warning-level issues that require attention.`,
      immediateActions: [
        "Identify devices with warning conditions",
        "Analyze warning patterns and trends",
        "Check for common underlying causes",
        "Prioritize warnings by severity and impact"
      ],
      troubleshootingSteps: [
        { step: 1, action: "Warning analysis", description: "Review all active warnings and their sources" },
        { step: 2, action: "Device health check", description: "Check individual device health and performance" },
        { step: 3, action: "Pattern analysis", description: "Look for common patterns in warning conditions" },
        { step: 4, action: "Root cause investigation", description: "Investigate underlying causes of warnings" },
        { step: 5, action: "Remediation planning", description: "Plan and execute warning resolution" }
      ],
      prevention: [
        "Proactive warning threshold tuning",
        "Regular device maintenance",
        "Performance optimization",
        "Capacity planning and monitoring",
        "Early warning system implementation"
      ],
      relatedMetrics: ["device.warnings", "system.performance", "network.health", "environmental.alerts"],
      severity: severity,
      estimatedImpact: "Medium",
      estimatedTimeToFix: "30-90 minutes"
    },
    'office.critical.count': {
      rootCause: `Critical issues detected in ${device} office: ${value}. Critical-level problems are affecting office operations and require immediate attention.`,
      immediateActions: [
        "Immediate assessment of critical issues",
        "Identify affected services and users",
        "Implement emergency response procedures",
        "Notify relevant stakeholders"
      ],
      troubleshootingSteps: [
        { step: 1, action: "Critical issue assessment", description: "Immediately assess the scope and impact of critical issues" },
        { step: 2, action: "Service impact analysis", description: "Determine which services and users are affected" },
        { step: 3, action: "Emergency response", description: "Implement emergency response and recovery procedures" },
        { step: 4, action: "Root cause analysis", description: "Investigate and identify root causes of critical issues" },
        { step: 5, action: "Recovery and restoration", description: "Execute recovery procedures and restore services" }
      ],
      prevention: [
        "Critical system redundancy",
        "Regular disaster recovery testing",
        "Proactive monitoring and alerting",
        "Emergency response procedures",
        "Regular system health assessments"
      ],
      relatedMetrics: ["system.critical", "service.availability", "recovery.time", "impact.assessment"],
      severity: severity,
      estimatedImpact: "Critical",
      estimatedTimeToFix: "Immediate - 2 hours"
    },
    'network.architecture.analysis': {
      rootCause: `Network architecture analysis for ${device} office: ${value}. This provides insights into the overall network design, connectivity, and performance.`,
      immediateActions: [
        "Review network topology and design",
        "Analyze connectivity patterns",
        "Check network performance metrics",
        "Verify redundancy and failover capabilities"
      ],
      troubleshootingSteps: [
        { step: 1, action: "Topology review", description: "Review network topology and device interconnections" },
        { step: 2, action: "Connectivity analysis", description: "Analyze connectivity patterns and performance" },
        { step: 3, action: "Performance assessment", description: "Check network performance and capacity utilization" },
        { step: 4, action: "Redundancy verification", description: "Verify redundancy and failover mechanisms" },
        { step: 5, action: "Optimization planning", description: "Plan network optimizations and improvements" }
      ],
      prevention: [
        "Regular network architecture reviews",
        "Performance monitoring and optimization",
        "Capacity planning and scaling",
        "Redundancy and failover testing",
        "Documentation and change management"
      ],
      relatedMetrics: ["network.topology", "connectivity.status", "performance.metrics", "redundancy.status"],
      severity: severity,
      estimatedImpact: "Low",
      estimatedTimeToFix: "30-60 minutes"
    },
    'vm.memory.util': {
      rootCause: `High memory utilization detected on ${device} (${value}%). This indicates the device is using most of its available RAM, which can lead to performance degradation, slow response times, and potential system instability.`,
      immediateActions: [
        "Check running processes consuming memory",
        "Monitor memory usage trends over time",
        "Review system logs for memory-related errors",
        "Check for memory leaks in applications"
      ],
      troubleshootingSteps: [
        { step: 1, action: "show processes memory", description: "Identify processes with highest memory usage" },
        { step: 2, action: "show memory statistics", description: "View detailed memory allocation and usage" },
        { step: 3, action: "show system resources", description: "Check overall system resource utilization" },
        { step: 4, action: "show logging | include memory", description: "Look for memory-related error messages" },
        { step: 5, action: "clear memory statistics", description: "Reset memory counters to get fresh baseline" }
      ],
      prevention: [
        "Implement memory monitoring alerts",
        "Regular memory usage analysis",
        "Optimize application memory usage",
        "Consider memory upgrade if consistently high",
        "Implement memory leak detection"
      ],
      relatedMetrics: ["vm.memory.free", "vm.memory.used", "system.cpu.util", "process.memory"],
      severity: severity,
      estimatedImpact: value > 90 ? "High" : value > 80 ? "Medium" : "Low",
      estimatedTimeToFix: value > 90 ? "30-60 minutes" : "15-30 minutes"
    },
    'system.cpu.util': {
      rootCause: `High CPU utilization detected on ${device} (${value}%). This indicates the device is under heavy processing load, which can cause slow response times, dropped packets, and system instability.`,
      immediateActions: [
        "Check running processes consuming CPU",
        "Monitor CPU usage patterns",
        "Review system logs for performance issues",
        "Check for runaway processes"
      ],
      troubleshootingSteps: [
        { step: 1, action: "show processes cpu", description: "Identify processes with highest CPU usage" },
        { step: 2, action: "show system resources", description: "View overall system resource utilization" },
        { step: 3, action: "show logging | include cpu", description: "Look for CPU-related error messages" },
        { step: 4, action: "show processes sorted", description: "View all processes sorted by resource usage" }
      ],
      prevention: [
        "Implement CPU monitoring alerts",
        "Regular performance analysis",
        "Optimize system configurations",
        "Consider hardware upgrade if consistently high",
        "Implement process monitoring"
      ],
      relatedMetrics: ["system.memory.util", "system.load", "process.cpu", "vm.memory.util"],
      severity: severity,
      estimatedImpact: value > 90 ? "High" : value > 80 ? "Medium" : "Low",
      estimatedTimeToFix: value > 90 ? "30-60 minutes" : "15-30 minutes"
    },
    'net.if.out.discards': {
      rootCause: `Network interface on ${device} is discarding outbound packets (${value} packets). This typically indicates buffer overflow, congestion, or QoS issues that prevent packets from being transmitted.`,
      immediateActions: [
        "Check interface utilization and traffic patterns",
        "Monitor buffer usage and queue depths",
        "Verify QoS configuration and policies",
        "Check for network congestion"
      ],
      troubleshootingSteps: [
        { step: 1, action: `show interfaces ${metric.split('[')[1]?.split(']')[0] || 'gigabitethernet0/1'}`, description: "Check interface status and detailed statistics" },
        { step: 2, action: "show interfaces counters", description: "View detailed packet counters and discards" },
        { step: 3, action: "show qos interface", description: "Check QoS configuration and queue status" },
        { step: 4, action: "show interfaces queue", description: "Check interface queue depths and drops" }
      ],
      prevention: [
        "Implement proper QoS policies",
        "Monitor interface utilization trends",
        "Upgrade bandwidth if consistently congested",
        "Implement traffic shaping",
        "Regular network capacity planning"
      ],
      relatedMetrics: ["net.if.in.discards", "net.if.out.errors", "net.if.speed", "net.if.utilization"],
      severity: severity,
      estimatedImpact: value > 1000 ? "High" : value > 100 ? "Medium" : "Low",
      estimatedTimeToFix: "20-45 minutes"
    },
    'net.if.in.errors': {
      rootCause: `Network interface on ${device} is receiving packets with errors (${value} packets). This indicates physical layer issues, cable problems, or interface hardware faults.`,
      immediateActions: [
        "Check physical cable connections",
        "Verify interface hardware status",
        "Monitor error patterns and timing",
        "Check for electrical interference"
      ],
      troubleshootingSteps: [
        { step: 1, action: `show interfaces ${metric.split('[')[1]?.split(']')[0] || 'gigabitethernet0/1'}`, description: "Check interface status and error counters" },
        { step: 2, action: "show interfaces counters errors", description: "View detailed error statistics" },
        { step: 3, action: "show interfaces description", description: "Check interface descriptions and status" },
        { step: 4, action: "show interfaces transceiver", description: "Check transceiver status and diagnostics" }
      ],
      prevention: [
        "Regular cable testing and replacement",
        "Monitor interface error rates",
        "Implement redundant connections",
        "Regular hardware maintenance",
        "Environmental monitoring (temperature, humidity)"
      ],
      relatedMetrics: ["net.if.out.errors", "net.if.in.discards", "net.if.speed", "net.if.duplex"],
      severity: severity,
      estimatedImpact: value > 1000 ? "High" : value > 100 ? "Medium" : "Low",
      estimatedTimeToFix: "15-45 minutes"
    },
    'ifOperStatus': {
      rootCause: `Interface operational status issue on ${device}. Interface is ${value === 1 ? 'up' : 'down'}, which ${value === 1 ? 'indicates normal operation' : 'prevents network connectivity and data transmission'}.`,
      immediateActions: [
        value === 1 ? "Monitor interface for stability" : "Check physical connections",
        value === 1 ? "Verify interface configuration" : "Test cable integrity",
        value === 1 ? "Check traffic patterns" : "Verify power and hardware status"
      ],
      troubleshootingSteps: [
        { step: 1, action: "show interfaces status", description: "Check interface operational status" },
        { step: 2, action: "show interfaces description", description: "View interface descriptions and status" },
        { step: 3, action: value === 1 ? "show interfaces counters" : "show interfaces brief", description: value === 1 ? "Check interface traffic statistics" : "Check interface basic status" },
        { step: 4, action: value === 1 ? "ping <neighbor>" : "show interfaces transceiver", description: value === 1 ? "Test connectivity to connected devices" : "Check transceiver status" }
      ],
      prevention: [
        "Regular interface monitoring",
        "Proactive cable maintenance",
        "Redundant interface configuration",
        "Regular hardware health checks",
        "Environmental monitoring"
      ],
      relatedMetrics: ["ifAdminStatus", "ifSpeed", "ifDuplex", "net.if.utilization"],
      severity: severity,
      estimatedImpact: value === 1 ? "Low" : "High",
      estimatedTimeToFix: value === 1 ? "5-15 minutes" : "15-45 minutes"
    },
    'sensor.temp': {
      rootCause: `Temperature sensor reading on ${device} shows ${value}°C. ${value > 80 ? 'Critical temperature detected - immediate attention required' : value > 70 ? 'High temperature warning - monitor closely' : 'Temperature within normal range'}.`,
      immediateActions: [
        value > 80 ? "Immediate cooling action required" : "Monitor temperature trends",
        value > 70 ? "Check cooling system operation" : "Verify sensor accuracy",
        value > 70 ? "Check environmental conditions" : "Regular temperature monitoring"
      ],
      troubleshootingSteps: [
        { step: 1, action: "show environment", description: "Check environmental conditions and sensor readings" },
        { step: 2, action: "show inventory", description: "Verify hardware components and sensors" },
        { step: 3, action: "show logging | include temp", description: "Look for temperature-related log messages" },
        { step: 4, action: "show processes cpu", description: "Check if high CPU usage is causing heat" }
      ],
      prevention: [
        "Regular environmental monitoring",
        "Proper ventilation and cooling",
        "Temperature alert thresholds",
        "Regular hardware maintenance",
        "Environmental control systems"
      ],
      relatedMetrics: ["sensor.fan.status", "system.cpu.util", "sensor.psu.status", "environment.temp"],
      severity: severity,
      estimatedImpact: value > 80 ? "Critical" : value > 70 ? "High" : "Low",
      estimatedTimeToFix: value > 80 ? "Immediate" : value > 70 ? "15-30 minutes" : "5-15 minutes"
    }
  }

  // Find matching solution based on metric patterns
  const metricKey = Object.keys(solutions).find(key => {
    if (metric.includes(key)) return true
    // Handle device-level health patterns
    if (key === 'device.health.overall' && metric.includes('device.health')) return true
    // Handle office-level metric patterns
    if (key === 'office.health.overall' && metric.includes('office.health')) return true
    if (key === 'office.devices.status' && metric.includes('office.devices')) return true
    if (key === 'office.warnings.count' && metric.includes('office.warnings')) return true
    if (key === 'office.critical.count' && metric.includes('office.critical')) return true
    if (key === 'network.architecture.analysis' && metric.includes('network.architecture')) return true
    // Handle device-level metric patterns
    if (key === 'vm.memory.util' && metric.includes('memory') && metric.includes('util')) return true
    if (key === 'system.cpu.util' && metric.includes('cpu') && metric.includes('util')) return true
    if (key === 'net.if.out.discards' && metric.includes('discard')) return true
    if (key === 'net.if.in.errors' && metric.includes('error')) return true
    if (key === 'ifOperStatus' && metric.includes('OperStatus')) return true
    if (key === 'sensor.temp' && metric.includes('temp')) return true
    return false
  })
  
  if (metricKey) {
    return solutions[metricKey]
  }

  // Enhanced generic solution based on metric type
  let genericRootCause = `Issue detected with metric ${metric} on device ${device}`
  let genericActions = ["Check device connectivity", "Verify configuration", "Review system logs"]
  let genericSteps = [
    { step: 1, action: `ping ${device}`, description: "Test basic connectivity to device" },
    { step: 2, action: "show version", description: "Check device information and uptime" },
    { step: 3, action: "show logging", description: "Review recent log messages" }
  ]
  let genericMetrics = ["interface_status", "cpu_usage", "memory_usage"]
  let genericImpact = "Medium"
  let genericTime = "20-40 minutes"

  // Customize based on metric type
  if (metric.includes('device.health') || (metric.includes('health') && metric.includes('device'))) {
    genericRootCause = `Device health issue detected for ${device} with metric ${metric} (value: ${value}). This indicates performance problems, potential hardware issues, or system instability.`
    genericActions = ["Check device performance metrics", "Review system logs", "Verify hardware status", "Analyze resource utilization"]
    genericSteps = [
      { step: 1, action: "show processes cpu", description: "Check CPU usage and identify high-usage processes" },
      { step: 2, action: "show memory", description: "Analyze memory utilization and allocation" },
      { step: 3, action: "show logging", description: "Review system logs for errors and warnings" },
      { step: 4, action: "show environment", description: "Check temperature and power status" }
    ]
    genericMetrics = ["system.cpu.util", "vm.memory.util", "device.uptime", "device.performance"]
    genericImpact = "Medium"
    genericTime = "30-60 minutes"
  } else if (metric.includes('office.health') || metric.includes('office')) {
    genericRootCause = `Office-level issue detected for ${device} with metric ${metric} (value: ${value}). This affects the overall office operations and device performance.`
    genericActions = ["Review office device status", "Check network connectivity", "Analyze performance trends", "Verify environmental conditions"]
    genericSteps = [
      { step: 1, action: "Office device inventory", description: "Review all devices in the office and their status" },
      { step: 2, action: "Connectivity analysis", description: "Test network connectivity and performance" },
      { step: 3, action: "Performance review", description: "Check overall office performance metrics" },
      { step: 4, action: "Environmental check", description: "Verify power, temperature, and physical conditions" }
    ]
    genericMetrics = ["office.device.count", "office.connectivity", "office.performance", "office.availability"]
    genericImpact = "Medium"
    genericTime = "30-60 minutes"
  } else if (metric.includes('memory')) {
    genericRootCause = `Memory-related issue detected on ${device} with metric ${metric} (value: ${value})`
    genericActions = ["Check memory usage", "Monitor memory trends", "Review memory-related logs"]
    genericSteps = [
      { step: 1, action: "show memory", description: "Check memory usage and allocation" },
      { step: 2, action: "show processes memory", description: "Identify memory-consuming processes" },
      { step: 3, action: "show logging | include memory", description: "Look for memory-related errors" }
    ]
    genericMetrics = ["vm.memory.util", "vm.memory.free", "vm.memory.used"]
  } else if (metric.includes('cpu')) {
    genericRootCause = `CPU-related issue detected on ${device} with metric ${metric} (value: ${value})`
    genericActions = ["Check CPU usage", "Monitor CPU trends", "Review performance logs"]
    genericSteps = [
      { step: 1, action: "show processes cpu", description: "Check CPU usage by process" },
      { step: 2, action: "show system resources", description: "View system resource utilization" },
      { step: 3, action: "show logging | include cpu", description: "Look for CPU-related errors" }
    ]
    genericMetrics = ["system.cpu.util", "system.load", "process.cpu"]
  } else if (metric.includes('interface') || metric.includes('if')) {
    genericRootCause = `Interface-related issue detected on ${device} with metric ${metric} (value: ${value})`
    genericActions = ["Check interface status", "Verify interface configuration", "Test connectivity"]
    genericSteps = [
      { step: 1, action: "show interfaces", description: "Check interface status and statistics" },
      { step: 2, action: "show interfaces counters", description: "View interface traffic counters" },
      { step: 3, action: "ping <neighbor>", description: "Test connectivity to connected devices" }
    ]
    genericMetrics = ["ifOperStatus", "ifAdminStatus", "net.if.speed"]
  }

  return {
    rootCause: genericRootCause,
    immediateActions: genericActions,
    troubleshootingSteps: genericSteps,
    prevention: [
      "Regular monitoring and alerting",
      "Proactive maintenance",
      "Configuration backups",
      "Performance optimization"
    ],
    relatedMetrics: genericMetrics,
    severity: severity,
    estimatedImpact: genericImpact,
    estimatedTimeToFix: genericTime
  }
}
