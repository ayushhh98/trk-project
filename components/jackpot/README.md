# Live Winner Feed Component Usage

## Overview
The `LiveWinnerFeed` component displays real-time jackpot winners as they are announced via WebSocket.

## Import
```tsx
import { LiveWinnerFeed } from "@/components/jackpot/LiveWinnerFeed";
```

## Variants

### 1. **Ticker Variant** (Horizontal Scrolling)
Perfect for page headers or hero sections:

```tsx
<LiveWinnerFeed variant="ticker" maxItems={15} />
```

### 2. **Feed Variant** (Vertical List)
Great for sidebars or dedicated winner sections:

```tsx
<LiveWinnerFeed variant="feed" maxItems={10} showAnimation={true} />
```

### 3. **Compact Variant** (Single Row)
Minimal space, shows only latest winner:

```tsx
<LiveWinnerFeed variant="compact" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"ticker" \| "feed" \| "compact"` | `"ticker"` | Display style |
| `maxItems` | `number` | `10` | Maximum winners to display |
| `showAnimation` | `boolean` | `true` | Enable confetti/animations |
| `className` | `string` | - | Additional CSS classes |

## Example: Dashboard Integration

```tsx
// app/dashboard/page.tsx
import { LiveWinnerFeed } from "@/components/jackpot/LiveWinnerFeed";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Ticker at top */}
      <LiveWinnerFeed variant="ticker" />
      
      {/* Your dashboard content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Main content */}
        </div>
        
        <div className="space-y-6">
          {/* Sidebar with live feed */}
          <LiveWinnerFeed variant="feed" maxItems={8} />
        </div>
      </div>
    </div>
  );
}
```

## Example: Jackpot Page

```tsx
// app/dashboard/lucky-draw/page.tsx
import { LiveWinnerFeed } from "@/components/jackpot/LiveWinnerFeed";

export default function LuckyDrawPage() {
  return (
    <div className="space-y-8">
      {/* Compact variant near buy button */}
      <div className="flex items-center justify-between">
        <h1>Lucky Draw Jackpot</h1>
        <LiveWinnerFeed variant="compact" />
      </div>
      
      {/* Jackpot interface */}
      {/* ... */}
      
      {/* Full feed at bottom */}
      <LiveWinnerFeed variant="feed" maxItems={20} />
    </div>
  );
}
```

## Features

✅ **Real-Time Updates** - Instant winner announcements via WebSocket  
✅ **Auto-Scroll Ticker** - Smooth horizontal scrolling (pauses on hover)  
✅ **Confetti Celebrations** - Automatic confetti for top 3 winners  
✅ **Live Indicator** - Shows connection status (LIVE/OFFLINE)  
✅ **Privacy Protection** - Automatically masks wallet addresses  
✅ **Responsive Design** - Works on all screen sizes  
✅ **Rank-Based Styling** - Color-coded for 1st, 2nd, 3rd places  

## WebSocket Events

The component automatically subscribes to:
- `jackpot:winner_announced` - Individual winner notifications
- `jackpot:draw_complete` - Full draw completion

## Styling

All styling is built-in using Tailwind CSS. Custom animations are defined in `app/globals.css`:
- `scroll-left` - Ticker scrolling
- `shimmer` - Loading shimmer effect
- `slide-in-from-top` - Winner entry animation
