# Advanced Analytics API Documentation

## Overview

The Advanced Analytics API provides comprehensive insights and analytics capabilities for QR codes, including conversion tracking, peak time analysis, heatmap generation, real-time metrics, and advanced export features.

## Base URL
```
/analytics/advanced
```

## Authentication
All endpoints require proper authentication headers.

## Error Responses
All endpoints return standardized error responses:
```json
{
  "error": "Error description",
  "details": "Detailed error message"
}
```

## Success Responses
All endpoints return standardized success responses:
```json
{
  "success": true,
  "data": { ... },
  "count": 10  // For list endpoints
}
```

---

## Conversion Goals

### Create Conversion Goal
**POST** `/conversion-goals`

Creates a new conversion goal for tracking specific user actions.

**Request Body:**
```json
{
  "qrCodeId": "string",
  "name": "string",
  "type": "url_visit" | "form_submit" | "purchase" | "download" | "custom",
  "targetUrl": "string (optional)",
  "targetValue": "number (optional)",
  "isActive": "boolean"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "goal_123",
    "qrCodeId": "qr_456",
    "name": "Newsletter Signup",
    "type": "form_submit",
    "targetUrl": "https://example.com/newsletter",
    "targetValue": 100,
    "isActive": true,
    "createdAt": "2025-10-15T12:00:00Z",
    "updatedAt": "2025-10-15T12:00:00Z"
  }
}
```

### Get Conversion Goal
**GET** `/conversion-goals/:goalId`

Retrieves a specific conversion goal.

### Get Conversion Goals by QR Code
**GET** `/qr-codes/:qrCodeId/conversion-goals`

Retrieves all conversion goals for a specific QR code.

### Update Conversion Goal
**PUT** `/conversion-goals/:goalId`

Updates an existing conversion goal.

### Delete Conversion Goal
**DELETE** `/conversion-goals/:goalId`

Deactivates a conversion goal.

---

## Conversion Events

### Record Conversion Event
**POST** `/conversion-events`

Records a new conversion event.

**Request Body:**
```json
{
  "goalId": "string",
  "scanEventId": "string",
  "qrCodeId": "string",
  "userId": "string (optional)",
  "conversionValue": "number (optional)",
  "conversionData": "object (optional)",
  "attributionModel": "first_touch" | "last_touch" | "linear" | "time_decay",
  "timeToConversion": "number"
}
```

### Get Conversion Funnel
**GET** `/conversion-goals/:goalId/funnel`

Retrieves conversion funnel data for a specific goal.

**Query Parameters:**
- `startDate`: ISO date string (optional, defaults to 30 days ago)
- `endDate`: ISO date string (optional, defaults to now)

**Response:**
```json
{
  "success": true,
  "data": {
    "goalId": "goal_123",
    "goalName": "Newsletter Signup",
    "stages": [
      {
        "stage": "Step 1",
        "count": 1000,
        "conversionRate": 100,
        "dropOffRate": 0
      },
      {
        "stage": "Step 2",
        "count": 750,
        "conversionRate": 75,
        "dropOffRate": 25
      }
    ],
    "totalConversions": 750,
    "overallConversionRate": 75,
    "averageTimeToConversion": 120,
    "topConvertingSegments": []
  }
}
```

### Get Conversion Events
**GET** `/conversion-goals/:goalId/events`

Retrieves conversion events for a specific goal.

**Query Parameters:**
- `limit`: Number of events to return (default: 100)
- `offset`: Number of events to skip (default: 0)

---

## Peak Time Analysis

### Get Peak Time Analysis
**GET** `/qr-codes/:qrCodeId/peak-time-analysis`

Retrieves peak time analysis for a QR code.

**Response:**
```json
{
  "success": true,
  "data": {
    "hourlyDistribution": [
      {
        "hour": 9,
        "scans": 150,
        "percentage": 15,
        "isBusinessHour": true
      }
    ],
    "dailyDistribution": [
      {
        "dayOfWeek": 1,
        "dayName": "Monday",
        "scans": 500,
        "percentage": 20,
        "isWeekend": false
      }
    ],
    "seasonalTrends": [
      {
        "month": 10,
        "monthName": "October",
        "scans": 2500,
        "percentage": 25,
        "growthRate": 15
      }
    ],
    "peakHours": [
      {
        "hour": 14,
        "scans": 200,
        "efficiency": 95
      }
    ],
    "recommendations": [
      {
        "type": "timing",
        "message": "Peak activity occurs between 2-4 PM",
        "impact": "high"
      }
    ]
  }
}
```

### Generate Peak Time Analysis
**POST** `/qr-codes/:qrCodeId/peak-time-analysis`

Generates new peak time analysis for a QR code.

**Request Body:**
```json
{
  "startDate": "2025-09-15T00:00:00Z (optional)",
  "endDate": "2025-10-15T23:59:59Z (optional)"
}
```

---

## Heatmap Data

### Get Heatmap Data
**GET** `/qr-codes/:qrCodeId/heatmap/:type`

Retrieves heatmap data for a QR code.

**Path Parameters:**
- `type`: `geographic` | `temporal` | `device` | `combined`

**Query Parameters:**
- `startDate`: ISO date string (optional, defaults to 7 days ago)
- `endDate`: ISO date string (optional, defaults to now)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "heatmap_123",
    "type": "geographic",
    "qrCodeId": "qr_456",
    "dataPoints": [
      {
        "x": 40.7128,
        "y": -74.0060,
        "value": 25,
        "intensity": 0.8,
        "metadata": {
          "city": "New York",
          "country": "USA"
        }
      }
    ],
    "maxValue": 100,
    "minValue": 1,
    "averageValue": 25,
    "generatedAt": "2025-10-15T12:00:00Z",
    "timeRange": {
      "startDate": "2025-10-08T12:00:00Z",
      "endDate": "2025-10-15T12:00:00Z"
    }
  }
}
```

### Generate Heatmap
**POST** `/qr-codes/:qrCodeId/heatmap`

Generates new heatmap data for a QR code.

**Request Body:**
```json
{
  "type": "geographic" | "temporal" | "device" | "combined",
  "startDate": "2025-10-08T00:00:00Z (optional)",
  "endDate": "2025-10-15T23:59:59Z (optional)"
}
```

### Update Heatmap Data
**PUT** `/qr-codes/:qrCodeId/heatmap`

Updates heatmap data for a QR code.

---

## Real-time Analytics

### Get Real-time Metrics
**GET** `/qr-codes/:qrCodeId/realtime-metrics`

Retrieves real-time metrics for a QR code.

**Query Parameters:**
- `metricName`: Specific metric name to retrieve (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "qrCodeId": "qr_456",
      "metricName": "active_scans",
      "metricValue": 42,
      "lastUpdated": "2025-10-15T12:00:00Z",
      "ttl": 300,
      "metadata": {
        "source": "real-time-tracker"
      }
    }
  ]
}
```

### Cache Real-time Metric
**POST** `/realtime-metrics/cache`

Caches a real-time metric value.

**Request Body:**
```json
{
  "qrCodeId": "string",
  "metricName": "string",
  "metricValue": "number",
  "metadata": "object (optional)"
}
```

---

## Advanced Export

### Create Export Job
**POST** `/exports`

Creates a new data export job.

**Request Body:**
```json
{
  "qrCodeId": "string",
  "exportType": "detailed_analytics" | "conversion_data" | "heatmap_data" | "peak_time_data",
  "startDate": "2025-09-15T00:00:00Z (optional)",
  "endDate": "2025-10-15T23:59:59Z (optional)",
  "format": "csv" | "json" | "xlsx",
  "filters": "object (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "export_1729000000_abc123def"
  }
}
```

### Get Export Job Status
**GET** `/exports/:jobId`

Retrieves the status of an export job.

**Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "export_1729000000_abc123def",
    "status": "completed",
    "progress": 100,
    "createdAt": "2025-10-15T12:00:00Z",
    "completedAt": "2025-10-15T12:05:00Z"
  }
}
```

### Download Export
**GET** `/exports/:jobId/download`

Gets the download URL for a completed export.

**Response:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://example.com/downloads/export_1729000000_abc123def.csv"
  }
}
```

### Get Export Jobs
**GET** `/qr-codes/:qrCodeId/exports`

Retrieves export jobs for a QR code.

**Query Parameters:**
- `limit`: Number of jobs to return (default: 20)
- `offset`: Number of jobs to skip (default: 0)

---

## Analytics Alerts

### Create Analytics Alert
**POST** `/alerts`

Creates a new analytics alert.

**Request Body:**
```json
{
  "qrCodeId": "string",
  "alertName": "string",
  "metricName": "string",
  "condition": "greater_than" | "less_than" | "equals" | "change_percentage",
  "threshold": "number",
  "isActive": "boolean",
  "notifications": {
    "email": ["admin@example.com"],
    "webhook": "https://example.com/webhook"
  }
}
```

### Get Analytics Alert
**GET** `/alerts/:alertId`

Retrieves a specific analytics alert.

### Get Analytics Alerts
**GET** `/qr-codes/:qrCodeId/alerts`

Retrieves all analytics alerts for a QR code.

### Update Analytics Alert
**PUT** `/alerts/:alertId`

Updates an existing analytics alert.

### Delete Analytics Alert
**DELETE** `/alerts/:alertId`

Deletes an analytics alert.

---

## Rate Limits

- Standard endpoints: 100 requests per minute
- Real-time endpoints: 500 requests per minute
- Export endpoints: 10 requests per minute

## Webhooks

Analytics alerts can trigger webhooks when conditions are met. Webhook payloads include:

```json
{
  "alertId": "alert_123",
  "qrCodeId": "qr_456",
  "alertName": "High Scan Volume",
  "metricName": "hourly_scans",
  "currentValue": 150,
  "threshold": 100,
  "condition": "greater_than",
  "triggeredAt": "2025-10-15T12:00:00Z",
  "metadata": {
    "previousValue": 85,
    "changePercentage": 76.47
  }
}
```

## Data Retention

- Scan events: 2 years
- Conversion data: 2 years
- Heatmap data: 1 year
- Real-time metrics: 30 days
- Export files: 30 days
- Alert history: 90 days