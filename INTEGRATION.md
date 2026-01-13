# Alemdar Flow - WatchPower Integration

Integration guide for connecting Alemdar Flow dashboard with WatchPower API via Flask backend.

## Quick Start

### 1. Start Flask Backend

```bash
cd alemdar-flow-flask
pip install -r requirements.txt
python app.py
```

Flask will start on `http://localhost:5000`

### 2. Start Next.js Frontend

```bash
cd alemdar-flow
pnpm install
pnpm dev
```

Next.js will start on `http://localhost:3000`

## Using the Live Data in Dashboard

### Option 1: Use the LiveDashboard Component

Replace mock data in your dashboard with the `LiveDashboard` component:

```tsx
import { LiveDashboard } from "@/components/live-dashboard";

export default function DashboardPage({ params }: { params: { id: string } }) {
  const serialNumber = params.id; // e.g., "00202507001060"

  return (
    <div className="container mx-auto p-6">
      <LiveDashboard serialNumber={serialNumber} />
    </div>
  );
}
```

### Option 2: Use the Hook Directly

For more control, use the `useInverterData` hook:

```tsx
import { useInverterData } from "@/hooks/use-inverter-data";

export default function CustomDashboard({
  serialNumber,
}: {
  serialNumber: string;
}) {
  const { data, loading, error } = useInverterData({
    serialNumber: "00202507001060",
    pollingInterval: 5000, // 5 seconds
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Solar Power: {data?.solar.totalPower} kW</h1>
      <h1>Battery: {data?.battery.capacity}%</h1>
      {/* Use data.acOutput, data.grid, etc. */}
    </div>
  );
}
```

## Available API Endpoints

### Next.js API Routes

- `GET /api/watchpower` - List all inverters
- `GET /api/watchpower/[serial]` - Get specific inverter data
- `GET /api/watchpower/[serial]/history?limit=100` - Get historical data
- `POST /api/watchpower/poll` - Force immediate polling

### Flask API Endpoints

Direct access (if needed):

- `GET http://localhost:5000/health` - Health check
- `GET http://localhost:5000/api/inverters` - List all inverters
- `GET http://localhost:5000/api/inverter/<serial>` - Get inverter data
- `GET http://localhost:5000/api/inverter/<serial>/history` - Historical data
- `POST http://localhost:5000/api/poll/force` - Force poll
- `GET http://localhost:5000/api/status` - Service status

## Data Structure

The transformed data structure from the API:

```typescript
{
  serialNumber: string;
  timestamp: string;
  lastUpdate: string;
  acOutput: {
    voltage: number;
    frequency: number;
    activePower: number;
    apparentPower: number;
    load: number;
  }
  battery: {
    voltage: number;
    capacity: number;
    chargingCurrent: number;
    dischargeCurrent: number;
  }
  solar: {
    pv1: {
      voltage, current, power;
    }
    pv2: {
      voltage, current, power;
    }
    totalPower: number;
    dailyEnergy: number;
  }
  grid: {
    voltage: number;
    frequency: number;
  }
  system: {
    temperature: number;
    loadOn: boolean;
    chargingOn: boolean;
  }
  status: {
    realtime: boolean;
    chargerSource: string;
    outputSource: string;
    batteryType: string;
  }
}
```

## Updating Dashboard Routes

To use serial numbers as route params instead of mock IDs:

```tsx
// app/dashboard/[id]/page.tsx
export default function DashboardPage({ params }: { params: { id: string } }) {
  // params.id will be the serial number (e.g., "00202507001060")
  return <LiveDashboard serialNumber={params.id} />;
}
```

Navigate to: `http://localhost:3000/dashboard/00202507001060`

## Configuration

### Flask Backend (.env)

```env
WATCHPOWER_USERNAME=your_username
WATCHPOWER_PASSWORD=your_password
FLASK_PORT=5000
POLL_INTERVAL_MINUTES=5
```

### Next.js Frontend (.env.local)

```env
FLASK_API_URL=http://localhost:5000
```

## Scaling to Multiple Inverters

Add more inverters to `alemdar-flow-flask/config/inverters.json`:

```json
[
  {
    "serial_number": "00202507001060",
    "wifi_pn": "W0068107329284",
    "device_code": 2449,
    "device_address": 1,
    "system_type": "offgrid",
    "alias": "OG-001"
  },
  {
    "serial_number": "00202507001061",
    "wifi_pn": "W0068107329285",
    "device_code": 2449,
    "device_address": 1,
    "system_type": "offgrid",
    "alias": "OG-002"
  }
]
```

The system automatically polls all configured inverters.

## Troubleshooting

### No Data Showing

1. Check Flask is running: `curl http://localhost:5000/health`
2. Check authentication: `curl http://localhost:5000/api/status`
3. Force a poll: `curl -X POST http://localhost:5000/api/poll/force`
4. Check Flask logs for errors

### CORS Errors

- Ensure `flask-cors` is installed
- Check FLASK_API_URL in `.env.local` matches Flask port

### Slow Updates

- Adjust `pollingInterval` in `useInverterData` hook (default 5000ms)
- Check Flask `POLL_INTERVAL_MINUTES` setting

## Next Steps

1. **Start both services** (Flask + Next.js)
2. **Test the integration** with the LiveDashboard component
3. **Customize styling** to match your dashboard design
4. **Add charts** using the historical data endpoint
5. **Scale to multiple inverters** by updating config

See `/components/live-dashboard.tsx` for a working example!
