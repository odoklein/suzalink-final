# Team Activity Tracking System - Complete Analysis

## Overview
The team activity tracking system in Suzalink monitors and displays real-time activity data for SDRs (Sales Development Representatives) and Business Developers. It consists of multiple interconnected components that track time, performance metrics, and team engagement.

---

## 1. Core Activity Tracking Components

### 1.1 ActivityChrono Component
**Location:** `components/sdr/ActivityChrono.tsx`

**Purpose:** Real-time activity timer displayed in the SDR/BD interface

**Key Features:**
- **Auto-start on mount**: Automatically starts tracking when user logs in
- **Heartbeat system**: Sends heartbeat every 60 seconds to maintain session
- **Inactivity detection**: Auto-pauses after 5 minutes of no user interaction
- **User interaction tracking**: Monitors mousemove, click, keydown, scroll, touchstart events
- **Visual status indicators**: Shows "En ligne" (Online) or "Pause" status

**State Management:**
```typescript
- isActive: boolean          // Whether session is currently active
- totalSeconds: number       // Total active seconds today
- currentSessionStart: Date  // When current session started
- isPaused: boolean          // Whether paused due to inactivity
```

**Display Location:** 
- Rendered in `AppLayoutShell.tsx` for SDR and BUSINESS_DEVELOPER roles
- Shows in top-right corner of the application

---

### 1.2 Database Schema - CrmActivityDay
**Location:** `prisma/schema.prisma` (lines 839-858)

**Structure:**
```prisma
model CrmActivityDay {
  id                      String    @id @default(cuid())
  userId                  String
  user                    User      @relation(...)
  date                    DateTime  @db.Date
  
  // Accumulated time for today (in seconds)
  totalActiveSeconds      Int       @default(0)
  
  // Current session (null when paused)
  currentSessionStartedAt DateTime?
  lastActivityAt          DateTime?
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  
  @@unique([userId, date])
}
```

**Key Points:**
- One record per user per day
- Tracks cumulative active time in seconds
- Session-based tracking with start time and last activity timestamp
- Auto-pause logic based on 5-minute inactivity threshold

---

## 2. API Endpoints

### 2.1 GET /api/sdr/activity
**File:** `app/api/sdr/activity/route.ts`

**Purpose:** Retrieve current activity status

**Features:**
- Returns own status for SDRs/BDs
- Managers can query specific user with `?userId=XXX`
- **Auto-pause logic**: If `lastActivityAt` is >5 minutes old, automatically pauses session
- Returns:
  ```typescript
  {
    isActive: boolean
    totalActiveSecondsToday: number
    currentSessionStartedAt: string | null
    lastActivityAt: string | null
  }
  ```

### 2.2 POST /api/sdr/activity/start
**File:** `app/api/sdr/activity/start/route.ts`

**Purpose:** Start or resume activity session

**Behavior:**
- Creates `CrmActivityDay` record if doesn't exist
- Sets `currentSessionStartedAt` to now
- Updates `lastActivityAt` to now
- Idempotent: safe to call multiple times

### 2.3 POST /api/sdr/activity/pause
**File:** `app/api/sdr/activity/pause/route.ts`

**Purpose:** Pause current session

**Behavior:**
- Calculates session duration
- Adds elapsed seconds to `totalActiveSeconds`
- Clears `currentSessionStartedAt`

### 2.4 POST /api/sdr/activity/heartbeat
**File:** `app/api/sdr/activity/heartbeat/route.ts`

**Purpose:** Keep session alive and update last activity timestamp

**Behavior:**
- Updates `lastActivityAt` to current time
- Prevents auto-pause from triggering
- Called every 60 seconds by `ActivityChrono`

### 2.5 GET /api/sdr/activity/batch
**File:** `app/api/sdr/activity/batch/route.ts`

**Purpose:** Batch fetch activity status for multiple users

**Usage:** Used by Team Dashboard to avoid N+1 queries
- Accepts `?userIds=id1,id2,id3`
- Returns map of userId → activity status

---

## 3. Team Dashboard Display

### 3.1 Main Team Dashboard
**Location:** `app/manager/team/page.tsx`

**Key Sections:**

#### A. Overview Stats (Top Cards)
Displays aggregate team metrics:
- **Total Members** / **Active Members** (online/busy status)
- **Total Scheduled Hours** / **Completed Hours** this week
- **Utilization Rate** (completed/scheduled %)
- **Total Calls** this week
- **Total Meetings** booked
- **Average Conversion Rate**

#### B. Member Cards Grid
Each team member card shows:
- **Avatar with status indicator**: 
  - 🟢 Green (online) - active from chrono
  - 🟡 Amber (busy) - in progress on schedule block
  - ⚪ Gray (away) - has blocks today but not active
  - ⚪ Gray (offline) - not active
- **Current mission** (if actively working)
- **Weekly stats**: Calls, Meetings, Conversion %
- **Hours breakdown bar**: Scheduled vs Completed
- **Daily hours chart**: 5-day mini bar chart (Mon-Fri)
- **Rank badge**: Top 3 performers get crown/medal icons
- **Streak badge**: Shows consecutive active days

#### C. Leaderboard Panel
Ranks top 5 performers by:
- Calls this week
- Meetings booked
- Hours completed

#### D. Utilization Heatmap
Visual grid showing:
- Each team member (rows)
- Each day of week (columns)
- Color-coded utilization %:
  - 🔴 Red (0-25%)
  - 🟠 Orange (25-50%)
  - 🟡 Amber (50-75%)
  - 🟢 Light Green (75-100%)
  - 🟢 Dark Green (100%+)

#### E. Activity Feed
Shows recent team actions:
- Call results (interested, callback, no response, etc.)
- Meetings booked
- Schedule block status changes (started/completed session)
- Formatted with relative timestamps ("Il y a 5 min", "Hier", etc.)

---

### 3.2 Data Fetching Strategy

**Initial Load:**
```typescript
Promise.all([
  fetch("/api/users?role=SDR,BUSINESS_DEVELOPER"),
  fetch("/api/planning?startDate=...&endDate=..."),
  fetch("/api/actions/stats"),
  fetch("/api/actions/recent?limit=8"),
  fetch("/api/sdr/activity/batch?userIds=...")
])
```

**Metrics Computation:**
For each team member:
1. **Schedule blocks** → Calculate daily/weekly hours
2. **Action stats** → Get calls, meetings, conversion rate
3. **Activity status** → Determine online/busy/away/offline
4. **Current mission** → Find active schedule block
5. **Performance ranking** → Sort by score (calls + meetings × 10)

---

## 4. Activity Feed System

### 4.1 Recent Actions API
**Location:** `app/api/actions/recent/route.ts`

**Data Sources:**
1. **Action records** (calls, meetings, etc.)
   - Includes contact/company name
   - Campaign association
   - Result type (MEETING_BOOKED, INTERESTED, etc.)

2. **Schedule block changes**
   - IN_PROGRESS status → "a démarré sa session"
   - COMPLETED status → "a terminé sa session"

**Formatting:**
- Relative time display
- User name abbreviation (e.g., "John D." instead of "John Doe")
- Action descriptions in French
- Sorted by most recent

### 4.2 Communications Activity
**Location:** `lib/comms/activity.ts`

**Purpose:** Track communication system activity (separate from CRM activity)

**Tracks:**
- New threads created
- New messages posted
- @mentions
- Status changes
- Reactions

**Component:** `components/comms/ActivityFeed.tsx`
- Displays recent comms activity
- Used in communication dashboards
- Separate from team performance tracking

---

## 5. Status Determination Logic

### Priority Order:
1. **Real-time chrono status** (from `/api/sdr/activity/batch`)
   - If `isActive: true` → Check schedule block
     - Has IN_PROGRESS block → "busy" 🟡
     - No IN_PROGRESS block → "online" 🟢
   
2. **Schedule block status** (if chrono not active)
   - Has active block (time matches) → "busy" or "online"
   
3. **User account status**
   - `isActive: true` + has blocks today → "away" ⚪
   - Otherwise → "offline" ⚪

### Visual Indicators:
```typescript
const STATUS_CONFIG = {
  online: { color: "bg-emerald-500", label: "En ligne", pulse: true },
  busy: { color: "bg-amber-500", label: "Occupé", pulse: true },
  away: { color: "bg-slate-400", label: "Absent", pulse: false },
  offline: { color: "bg-slate-300", label: "Hors ligne", pulse: false },
}
```

---

## 6. Where Activity is Displayed

### 6.1 SDR/BD View
- **Top bar**: `ActivityChrono` component
  - Shows total active time today
  - Play/Pause controls
  - Status badge (En ligne/Pause)

### 6.2 Manager Team Dashboard
**Location:** `app/manager/team/page.tsx`

**Sections:**
1. **Overview Cards** (lines 1010-1050)
   - Team-wide aggregated stats
   
2. **Member Cards Grid** (lines 1060-1120)
   - Individual performance cards
   - Status indicators
   - Weekly metrics
   
3. **Leaderboard** (lines 537-628)
   - Top performers by metric
   
4. **Utilization Heatmap** (lines 634-726)
   - Weekly utilization visualization
   
5. **Activity Feed** (lines 732-768)
   - Recent team actions

### 6.3 Team Member Detail Page
**Location:** `app/manager/team/[id]/page.tsx`

**Displays:**
- Real-time activity status (refreshes every 30s)
- Total active time today
- Detailed performance metrics
- Schedule blocks
- Action history
- Mission performance breakdown

---

## 7. Key Metrics Tracked

### Time Metrics:
- `scheduledHoursThisWeek` - Total hours planned
- `completedHoursThisWeek` - Total hours worked
- `scheduledHoursThisMonth` - Monthly planned (week × 4)
- `completedHoursThisMonth` - Monthly worked (week × 4)

### Performance Metrics:
- `callsToday` - Calls made today
- `callsThisWeek` - Calls this week
- `callsThisMonth` - Calls this month
- `avgCallsPerHour` - Calls / completed hours
- `meetingsBooked` - Total meetings
- `meetingsBookedThisWeek` - Weekly meetings
- `conversionRate` - (meetings / calls) × 100

### Activity Metrics:
- `lastActiveAt` - Last activity timestamp
- `currentMission` - Current mission name
- `activeBlockId` - Current schedule block ID
- `status` - online/busy/away/offline
- `currentStreak` - Consecutive active days
- `weeklyRank` - Performance ranking
- `monthlyScore` - Calls + (meetings × 10)

---

## 8. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERACTION                         │
│  (mousemove, click, keydown, scroll, touchstart)            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              ActivityChrono Component                        │
│  • Tracks user interactions                                  │
│  • Updates lastInteractionRef                                │
│  • Sends heartbeat every 60s                                 │
│  • Checks inactivity every 30s                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Endpoints                               │
│  POST /api/sdr/activity/start                                │
│  POST /api/sdr/activity/pause                                │
│  POST /api/sdr/activity/heartbeat                            │
│  GET  /api/sdr/activity                                      │
│  GET  /api/sdr/activity/batch                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Database (CrmActivityDay)                       │
│  • userId, date (unique)                                     │
│  • totalActiveSeconds                                        │
│  • currentSessionStartedAt                                   │
│  • lastActivityAt                                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Manager Team Dashboard                             │
│  • Fetches batch activity status                             │
│  • Computes metrics per member                               │
│  • Displays status indicators                                │
│  • Shows activity feed                                       │
│  • Renders leaderboards & heatmaps                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Auto-Pause Logic

### Trigger Conditions:
1. **Client-side** (ActivityChrono):
   - Checks every 30 seconds
   - If 5+ minutes since last interaction → calls `/pause`

2. **Server-side** (GET /api/sdr/activity):
   - On status fetch, checks `lastActivityAt`
   - If 5+ minutes old → auto-pauses and updates DB

### Session Calculation:
```typescript
const sessionDuration = lastActivityAt - currentSessionStartedAt
const sessionSeconds = Math.floor(sessionDuration / 1000)
totalActiveSeconds += sessionSeconds
currentSessionStartedAt = null  // Clear session
```

---

## 10. Integration Points

### Where Activity Data is Used:

1. **Team Dashboard** (`app/manager/team/page.tsx`)
   - Member status indicators
   - Performance metrics
   - Leaderboards
   - Utilization heatmap

2. **Team Member Detail** (`app/manager/team/[id]/page.tsx`)
   - Individual activity tracking
   - Real-time status updates (every 30s)

3. **SDR Dashboard** (`app/sdr/page.tsx`)
   - Personal activity chrono
   - Today's active time

4. **Planning Page** (`app/manager/planning/page.tsx`)
   - Schedule block status
   - Member availability

5. **Notifications System**
   - Activity-based alerts
   - Inactivity warnings (potential)

---

## 11. Performance Optimizations

### Batch Fetching:
- Uses `/api/sdr/activity/batch` to fetch multiple user statuses in one request
- Avoids N+1 query problem on team dashboard

### Caching Strategy:
- Activity status refreshed every 30s on detail pages
- Team dashboard fetches on mount + manual refresh
- Heartbeat updates don't trigger full re-fetch

### Efficient Queries:
- Unique index on `[userId, date]` for fast lookups
- Indexed fields: `userId`, `date`
- Single query per user per day

---

## 12. Future Enhancement Opportunities

### Potential Improvements:
1. **Streak Tracking**
   - Currently set to 0 (placeholder)
   - Could track consecutive active days in DB

2. **Real-time Updates**
   - WebSocket/SSE for live status changes
   - Instant leaderboard updates

3. **Advanced Analytics**
   - Activity patterns (peak hours)
   - Productivity trends
   - Burnout detection

4. **Gamification**
   - Achievement badges
   - Team challenges
   - Milestone celebrations

5. **Reporting**
   - Weekly/monthly activity reports
   - Export to CSV/PDF
   - Manager insights dashboard

---

## Summary

The team activity system is a comprehensive solution that:
- ✅ Tracks real-time user activity with auto-pause
- ✅ Displays status across multiple dashboards
- ✅ Provides performance metrics and rankings
- ✅ Integrates with scheduling and CRM actions
- ✅ Optimized for performance with batch queries
- ✅ Supports both individual and team views

**Key Files:**
- `components/sdr/ActivityChrono.tsx` - Client-side tracker
- `app/api/sdr/activity/**` - API endpoints
- `app/manager/team/page.tsx` - Team dashboard
- `prisma/schema.prisma` - CrmActivityDay model
- `app/api/actions/recent/route.ts` - Activity feed

**Database Tables:**
- `CrmActivityDay` - Daily activity tracking
- `Action` - Call/meeting records
- `ScheduleBlock` - Planned work sessions
- `User` - Team member info
