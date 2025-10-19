# US12.1-12.5: Complete Developer Analytics Dashboard System

**Epic:** Epic 12 - Developer Analytics Dashboard  
**Sprint:** Week 12, Day 1-4  
**Story Points:** 20 (combined)  
**Priority:** P2  
**Assigned To:** Full Stack Team  
**Status:** Not Started

---

## 📋 Combined User Stories

Comprehensive developer analytics system including data collection, real-time updates, dashboard UI, and reporting features.

---

## 🎯 Combined Acceptance Criteria

### Analytics Data Collection (AC1-AC5)
- [ ] AnalyticsEvent entity (PageView, AppClick, InstallClick, etc.)
- [ ] POST /api/analytics/track endpoint
- [ ] Client-side tracking service
- [ ] Event batching (send every 10 events or 30 seconds)
- [ ] Privacy-compliant (no PII)

### Backend Analytics API (AC6-AC10)
- [ ] GET /api/developers/analytics/overview
- [ ] GET /api/developers/analytics/apps/{appId}
- [ ] Metrics: views, clicks, installs (estimated), conversion rate
- [ ] Time-based filtering (7d, 30d, 90d, all-time)
- [ ] Aggregation queries optimized

### Real-Time Updates (AC11-AC14)
- [ ] SignalR hub for analytics updates
- [ ] Real-time view count updates
- [ ] Push updates every 30 seconds
- [ ] Connection management

### Dashboard UI (AC15-AC20)
- [ ] Analytics dashboard route: `/developer/analytics`
- [ ] Overview cards (total views, clicks, top apps)
- [ ] Line chart for views over time (Chart.js/ng2-charts)
- [ ] Top performing apps table
- [ ] Conversion funnel visualization
- [ ] Date range selector

### Export & Reporting (AC21-AC24)
- [ ] Export to CSV endpoint
- [ ] Export to PDF endpoint
- [ ] Scheduled email reports (weekly/monthly)
- [ ] Custom date range export

---

## 📝 Technical Implementation

### Analytics Event Entity
```python
public class AnalyticsEvent
{
    public Guid Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string EventType { get; set; } // PageView, AppClick, InstallClick
    
    [Required]
    public Guid AppId { get; set; }
    
    public Guid? UserId { get; set; }
    public string SessionId { get; set; }
    
    [MaxLength(500)]
    public string ReferrerUrl { get; set; }
    
    [MaxLength(500)]
    public string UserAgent { get; set; }
    
    [Column(TypeName = "jsonb")]
    public string MetadataJson { get; set; }
    
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public App App { get; set; }
}

public static class AnalyticsEventTypes
{
    public const string PageView = "page_view";
    public const string AppClick = "app_click";
    public const string InstallClick = "install_click";
    public const string FavoriteAdd = "favorite_add";
    public const string ShareClick = "share_click";
}
```

### ViewSet
```python
class AnalyticsTrackingViewSet(viewsets.ModelViewSet):
{
    
    [AllowAnonymous]
    {
        // Fire and forget - don't await
        _ = _analyticsService.TrackEventAsync(new AnalyticsEvent
        {
            Id = Guid.NewGuid(),
            EventType = dto.EventType,
            AppId = dto.AppId,
            UserId = User.Identity?.IsAuthenticated == true 
                ? uuid.UUID(request.user.id)
                : null,
            SessionId = dto.SessionId,
            ReferrerUrl = Request.Headers["Referer"].ToString(),
            UserAgent = Request.Headers["User-Agent"].ToString(),
            MetadataJson = dto.Metadata != null 
                ? JsonSerializer.Serialize(dto.Metadata) 
                : null,
            Timestamp = DateTime.UtcNow
        });
        
        return Accepted();
    }
    
    [AllowAnonymous]
    {
        _ = _analyticsService.TrackBatchAsync(events);
        
        return Accepted();
    }
}
```

### ViewSet
```python
class DeveloperAnalyticsViewSet(viewsets.ModelViewSet):
{
    def <AnalyticsOverviewDto>> GetOverview(
    {
        var userId = request.user.id;
        
        var overview = await _analyticsService.GetDeveloperOverviewAsync(
            uuid.UUID(userId), days);
        
        return Ok(overview);
    }
    
    def <AppAnalyticsDto>> GetAppAnalytics(
        Guid appId,
    {
        var userId = request.user.id;
        
        // Verify developer owns this app
        var app = await _context.Apps.FindAsync(appId);
        if (app == null || app.DeveloperId.ToString() != userId)
        
        var analytics = await _analyticsService.GetAppAnalyticsAsync(appId, days);
        
        return Ok(analytics);
    }
    
    def  ExportToCsv(
    {
        var userId = request.user.id;
        
        var csv = await _analyticsService.ExportToCsvAsync(
            uuid.UUID(userId), startDate, endDate);
        
        return File(
            Encoding.UTF8.GetBytes(csv),
            "text/csv",
            $"analytics-{startDate:yyyyMMdd}-{endDate:yyyyMMdd}.csv");
    }
}
```

### Analytics Service
```python
public class AnalyticsService
{
    public async Task<AnalyticsOverviewDto> GetDeveloperOverviewAsync(
        Guid userId,
        int days)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-days);
        
        // Get developer's apps
        var developerProfile = await _context.DeveloperProfiles
            .FirstOrDefaultAsync(dp => dp.UserId == userId);
        
        var appIds = await _context.Apps
            .Where(a => a.DeveloperId == developerProfile.Id)
            .Select(a => a.Id)
            .ToListAsync();
        
        // Aggregate analytics
        var events = await _context.AnalyticsEvents
            .Where(e => appIds.Contains(e.AppId) && e.Timestamp >= cutoffDate)
            .GroupBy(e => e.EventType)
            .Select(g => new { EventType = g.Key, Count = g.Count() })
            .ToListAsync();
        
        var totalViews = events.FirstOrDefault(e => e.EventType == AnalyticsEventTypes.PageView)?.Count ?? 0;
        var totalClicks = events.FirstOrDefault(e => e.EventType == AnalyticsEventTypes.AppClick)?.Count ?? 0;
        var totalInstallClicks = events.FirstOrDefault(e => e.EventType == AnalyticsEventTypes.InstallClick)?.Count ?? 0;
        
        // Views over time
        var viewsOverTime = await _context.AnalyticsEvents
            .Where(e => appIds.Contains(e.AppId) && 
                       e.EventType == AnalyticsEventTypes.PageView &&
                       e.Timestamp >= cutoffDate)
            .GroupBy(e => e.Timestamp.Date)
            .Select(g => new DailyMetric
            {
                Date = g.Key,
                Count = g.Count()
            })
            .OrderBy(x => x.Date)
            .ToListAsync();
        
        // Top apps
        var topApps = await _context.AnalyticsEvents
            .Where(e => appIds.Contains(e.AppId) && e.Timestamp >= cutoffDate)
            .GroupBy(e => new { e.AppId, e.App.NameEn })
            .Select(g => new TopAppMetric
            {
                AppId = g.Key.AppId,
                AppName = g.Key.NameEn,
                Views = g.Count(e => e.EventType == AnalyticsEventTypes.PageView),
                Clicks = g.Count(e => e.EventType == AnalyticsEventTypes.AppClick)
            })
            .OrderByDescending(x => x.Views)
            .Take(10)
            .ToListAsync();
        
        return new AnalyticsOverviewDto
        {
            TotalViews = totalViews,
            TotalClicks = totalClicks,
            TotalInstallClicks = totalInstallClicks,
            ConversionRate = totalViews > 0 ? (totalInstallClicks / (double)totalViews) * 100 : 0,
            ViewsOverTime = viewsOverTime,
            TopApps = topApps
        };
    }
}
```

### SignalR Analytics Hub
```python
public class AnalyticsHub : Hub
{
    
    public async Task SubscribeToAppAnalytics(Guid appId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"app_{appId}");
    }
    
    public async Task UnsubscribeFromAppAnalytics(Guid appId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"app_{appId}");
    }
}

// Background service to push updates
public class AnalyticsUpdateService : BackgroundService
{
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Get recent analytics and push to connected clients
            // Implementation...
            
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
```

### Frontend Analytics Dashboard
```typescript
@Component({
  selector: 'app-developer-analytics-dashboard',
  template: `
    <div class="analytics-dashboard">
      <h1>Analytics Dashboard</h1>
      
      <!-- Date Range Selector -->
      <mat-button-toggle-group [(value)]="selectedRange" (change)="onRangeChange()">
        <mat-button-toggle value="7">Last 7 days</mat-button-toggle>
        <mat-button-toggle value="30">Last 30 days</mat-button-toggle>
        <mat-button-toggle value="90">Last 90 days</mat-button-toggle>
      </mat-button-toggle-group>
      
      <!-- Overview Cards -->
      <div class="metrics-grid" *ngIf="overview">
        <mat-card>
          <h3>Total Views</h3>
          <h2>{{ overview.totalViews | number }}</h2>
          <span [class.positive]="viewsGrowth > 0" [class.negative]="viewsGrowth < 0">
            {{ viewsGrowth > 0 ? '+' : '' }}{{ viewsGrowth }}%
          </span>
        </mat-card>
        
        <mat-card>
          <h3>Total Clicks</h3>
          <h2>{{ overview.totalClicks | number }}</h2>
        </mat-card>
        
        <mat-card>
          <h3>Install Clicks</h3>
          <h2>{{ overview.totalInstallClicks | number }}</h2>
        </mat-card>
        
        <mat-card>
          <h3>Conversion Rate</h3>
          <h2>{{ overview.conversionRate | number:'1.1-1' }}%</h2>
        </mat-card>
      </div>
      
      <!-- Views Chart -->
      <mat-card class="chart-card">
        <mat-card-header>
          <mat-card-title>Views Over Time</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <canvas baseChart
            [datasets]="lineChartData"
            [labels]="lineChartLabels"
            [options]="lineChartOptions"
            [type]="'line'">
          </canvas>
        </mat-card-content>
      </mat-card>
      
      <!-- Top Apps Table -->
      <mat-card class="table-card">
        <mat-card-header>
          <mat-card-title>Top Performing Apps</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="overview?.topApps" class="mat-elevation-z0">
            <ng-container matColumnDef="appName">
              <th mat-header-cell *matHeaderCellDef>App Name</th>
              <td mat-cell *matCellDef="let app">{{ app.appName }}</td>
            </ng-container>
            
            <ng-container matColumnDef="views">
              <th mat-header-cell *matHeaderCellDef>Views</th>
              <td mat-cell *matCellDef="let app">{{ app.views | number }}</td>
            </ng-container>
            
            <ng-container matColumnDef="clicks">
              <th mat-header-cell *matHeaderCellDef>Clicks</th>
              <td mat-cell *matCellDef="let app">{{ app.clicks | number }}</td>
            </ng-container>
            
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class DeveloperAnalyticsDashboardComponent implements OnInit {
  overview: AnalyticsOverview;
  selectedRange = 30;
  
  lineChartData: ChartConfiguration['data']['datasets'];
  lineChartLabels: string[];
  lineChartOptions: ChartOptions = {
    responsive: true,
    scales: {
      y: { beginAtZero: true }
    }
  };
  
  constructor(
    private analyticsService: DeveloperAnalyticsService,
    private hubConnection: AnalyticsHubService
  ) {}
  
  ngOnInit(): void {
    this.loadAnalytics();
    this.subscribeToRealTimeUpdates();
  }
  
  loadAnalytics(): void {
    this.analyticsService.getOverview(this.selectedRange).subscribe(overview => {
      this.overview = overview;
      this.updateChart();
    });
  }
  
  updateChart(): void {
    this.lineChartLabels = this.overview.viewsOverTime.map(v => 
      new Date(v.date).toLocaleDateString()
    );
    
    this.lineChartData = [{
      data: this.overview.viewsOverTime.map(v => v.count),
      label: 'Views',
      borderColor: '#1976d2',
      fill: false
    }];
  }
  
  subscribeToRealTimeUpdates(): void {
    this.hubConnection.connect();
    
    this.hubConnection.onAnalyticsUpdate().subscribe(update => {
      // Update metrics in real-time
      this.overview.totalViews += update.newViews;
      this.overview.totalClicks += update.newClicks;
    });
  }
  
  onRangeChange(): void {
    this.loadAnalytics();
  }
}
```

---

## 🔗 Dependencies
- US11.1-11.6: Developer portal
- Chart.js for visualizations
- SignalR for real-time updates

---

## 📊 Definition of Done
- [ ] Analytics tracking working
- [ ] Backend analytics API complete
- [ ] SignalR real-time updates functional
- [ ] Dashboard UI with charts complete
- [ ] Export to CSV/PDF working
- [ ] Email reports scheduled
- [ ] Performance optimized for large datasets
- [ ] Unit tests pass
- [ ] Integration tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 12: Developer Analytics Dashboard](../epics/epic-12-developer-analytics-dashboard.md)
