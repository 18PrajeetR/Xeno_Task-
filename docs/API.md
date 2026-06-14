# API Surface

All endpoints are under `/api/v1`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Readiness and dependency status |
| `GET` | `/dashboard` | KPIs, trends, campaigns, and insight feed |
| `POST` | `/copilot/plan` | Generate a structured Gemini campaign plan |
| `POST` | `/campaigns` | Approve a plan and persist its segment/campaign |
| `POST` | `/campaigns/:id/launch` | Queue audience communications |
| `GET` | `/campaigns` | Campaign list and aggregate performance |
| `GET` | `/campaigns/:id` | Campaign, audience, forecast, and lifecycle |
| `GET` | `/customers` | Filtered and ranked shopper list |
| `GET` | `/customers/:id` | Shopper intelligence profile |
| `GET` | `/analytics` | Time-series funnel, ROI, channel, and attribution |
| `GET` | `/insights` | Executive AI insight feed |
| `POST` | `/callbacks/channel-events` | Signed simulator lifecycle callback |

Internal simulator access uses a service token:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/internal/communications/claim` | Lease queued sends |
| `POST` | `/internal/communications/:id/release` | Release a failed lease |

## Copilot Contract

Request:

```json
{
  "goal": "Bring back inactive customers without increasing fatigue"
}
```

Response:

```json
{
  "planId": "uuid",
  "goal": "Reactivate dormant shoppers",
  "audience": {
    "name": "Recoverable dormant shoppers",
    "rules": { "daysSinceLastOrder": { "min": 60 }, "maxFatigueScore": 69 },
    "estimatedSize": 248,
    "protectedByFatiguePolicy": 37,
    "reasoning": "..."
  },
  "strategy": { "summary": "...", "reasoning": "..." },
  "channel": { "value": "WHATSAPP", "reasoning": "..." },
  "message": { "body": "...", "reasoning": "..." },
  "expectedOutcome": {
    "openRate": [0.62, 0.69],
    "clickRate": [0.12, 0.16],
    "conversionRate": [0.05, 0.08],
    "revenue": [4200, 6800]
  },
  "source": "GEMINI"
}
```

