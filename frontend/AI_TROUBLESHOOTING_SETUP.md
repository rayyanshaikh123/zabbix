# AI-Powered Troubleshooting Setup

## Overview

The AI-powered troubleshooting feature provides intelligent solutions for network monitoring alerts. When users encounter warnings or errors in the Agent Logs & Troubleshooting section, they can click the "AI Fix" button to get:

1. **Root Cause Analysis** - AI explanation of what's causing the issue
2. **Immediate Actions** - Quick steps to investigate the problem
3. **Troubleshooting Steps** - Detailed commands and actions to fix the issue
4. **Prevention Tips** - How to avoid this issue in the future
5. **Related Metrics** - Other metrics to monitor

## Setup Instructions

### 1. Hugging Face API Key

1. Go to [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Create a new API token
3. Add it to your environment variables:

```bash
# In your .env.local file
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```

### 2. Fallback System

If the Hugging Face API is unavailable or fails, the system automatically falls back to a rule-based troubleshooting system that provides solutions for common network issues.

## How It Works

### 1. User Experience

1. User sees a warning/error in the Agent Logs & Troubleshooting section
2. An "AI Fix" button appears next to the severity badge
3. Clicking the button opens a modal with AI-powered analysis
4. The modal shows comprehensive troubleshooting information

### 2. Technical Flow

1. **Frontend**: User clicks "AI Fix" button
2. **API Call**: Sends alert details to `/api/ai-troubleshoot`
3. **AI Processing**: Calls Hugging Face API with structured prompt
4. **Response**: Returns structured JSON with solution
5. **Display**: Modal shows formatted troubleshooting information

### 3. Data Structure

The AI receives this information:
- Device name (e.g., "Cisco_R1")
- Metric name (e.g., "net.if.out.discards[ifOutDiscards.2]")
- Current value (e.g., "0")
- Severity level (e.g., "warn")
- Automated suggestion (e.g., "Check net.if.out.discards[ifOutDiscards.2] on Cisco_R1")

## Supported Metrics

The system includes specialized solutions for:

- **Network Interface Issues**: `net.if.out.discards`, `ifOperStatus`, etc.
- **CPU/Memory Issues**: `system.cpu.util`, `system.memory.util`
- **Interface Status**: `ifOperStatus`, `ifAdminStatus`
- **Traffic Metrics**: `net.if.in.bits`, `net.if.out.bits`
- **Hardware Issues**: Fan status, power supply, temperature

## Example Solutions

### Network Interface Discards
```
Root Cause: Network interface is discarding outbound packets, likely due to congestion or buffer issues

Immediate Actions:
- Check interface utilization
- Monitor traffic patterns
- Verify QoS configuration

Troubleshooting Steps:
1. show interfaces gigabitethernet0/1 - Check interface status and statistics
2. show interfaces counters - View detailed packet counters
3. show qos interface - Check QoS configuration

Prevention:
- Implement proper QoS policies
- Monitor interface utilization
- Upgrade bandwidth if needed
```

### High CPU Usage
```
Root Cause: High CPU utilization detected, may indicate performance issues or resource constraints

Immediate Actions:
- Check running processes
- Monitor CPU usage trends
- Review system logs

Troubleshooting Steps:
1. show processes cpu - Check CPU usage by process
2. show system resources - View overall system resource usage
3. show logging - Check for error messages

Prevention:
- Regular performance monitoring
- Optimize configurations
- Upgrade hardware if needed
```

## Customization

### Adding New Metric Types

To add support for new metric types, update the `generateFallbackSolution` function in `/api/ai-troubleshoot/route.ts`:

```typescript
const solutions: { [key: string]: any } = {
  'your.new.metric': {
    rootCause: "Description of the issue",
    immediateActions: ["Action 1", "Action 2"],
    troubleshootingSteps: [
      { step: 1, action: "command", description: "What this does" }
    ],
    prevention: ["Prevention tip 1"],
    relatedMetrics: ["related.metric1"],
    severity: severity,
    estimatedImpact: "Medium",
    estimatedTimeToFix: "30 minutes"
  }
}
```

### Modifying AI Prompts

Update the prompt in the `/api/ai-troubleshoot/route.ts` file to customize how the AI analyzes issues.

## Troubleshooting

### Common Issues

1. **API Key Not Working**: Verify the Hugging Face API key is correct and has proper permissions
2. **Slow Responses**: The AI API can be slow; the system includes loading states
3. **Fallback Not Working**: Check that the fallback system is properly implemented

### Debug Mode

Enable debug logging by checking the browser console for API responses and errors.

## Future Enhancements

- **Caching**: Cache AI responses for similar issues
- **Learning**: Improve solutions based on user feedback
- **Integration**: Connect with ticketing systems
- **Automation**: Execute troubleshooting commands automatically
