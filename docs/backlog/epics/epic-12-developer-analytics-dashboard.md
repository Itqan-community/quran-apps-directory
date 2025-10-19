# Epic 12: Developer Analytics Dashboard

## 📋 Epic Overview
Provide developers with comprehensive analytics about their app performance, user engagement, and platform insights to help them optimize their listings.

## 🎯 Goal
Increase developer engagement and app quality by providing actionable insights into app performance and user behavior.

## 📊 Success Metrics
- 80% of developers access dashboard monthly
- Average session time >5 minutes
- Developers act on insights (update listings) within 7 days
- Dashboard load time <2 seconds
- Data accuracy >99%

## 🏗️ Technical Scope (Django)
- Analytics data collection (page views, clicks, installs)
- Dashboard UI with charts and metrics
- Real-time data updates with SignalR
- Export capabilities (PDF, CSV)
- Keyword insights and search visibility
- Competitor analysis (basic)
- Performance trends over time

## 🔗 Dependencies
- Epic 11: Developer portal
- Epic 4: API analytics endpoints

## 📈 Business Value
- High: Developer retention and engagement
- Impact: Improves app quality through insights
- Effort: 3-4 days implementation

## ✅ Definition of Done
- Dashboard displays key metrics (views, clicks, installs)
- Charts render correctly (Line, Bar, Pie)
- Data exportable as PDF/CSV
- Real-time updates functional
- Mobile-responsive dashboard
- Performance optimized (<2s load)

## Related Stories
- US12.1: Analytics Data Collection System
- US12.2: Dashboard UI with Charts
- US12.3: Real-Time Updates with SignalR
- US12.4: Export Functionality
- US12.5: Keyword Insights Feature

## Django Implementation Details
### Entity Models
```python
public class AnalyticsEvent
{
    public Guid Id { get; set; }
    public Guid AppId { get; set; }
    public AnalyticsEventType EventType { get; set; }
    public Guid? UserId { get; set; } // Anonymous if null
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? Referrer { get; set; }
    public string? SearchKeywords { get; set; } // If came from search
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    public App App { get; set; } = null!;
    public ApplicationUser? User { get; set; }
}

public enum AnalyticsEventType
{
    PageView,
    DetailView,
    GooglePlayClick,
    AppStoreClick,
    AppGalleryClick,
    WebsiteClick,
    ShareClick,
    FavoriteAdd,
    ReviewSubmit
}

public class AppAnalyticsSummary
{
    public Guid AppId { get; set; }
    public DateTime Date { get; set; }
    public int PageViews { get; set; }
    public int DetailViews { get; set; }
    public int StoreClicks { get; set; }
    public int Shares { get; set; }
    public int NewFavorites { get; set; }
    public int NewReviews { get; set; }
    
    public App App { get; set; } = null!;
}
```

### AnalyticsViewSet
```python
[ApiViewSet]
public class AnalyticsViewSet : ViewSetBase
{
    
    // Track events (public endpoint)
    {
        var userId = User.Identity?.IsAuthenticated == true ? GetUserId() : (Guid?)null;
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
        var referrer = HttpContext.Request.Headers["Referer"].ToString();
        
        await _analyticsService.TrackEventAsync(new AnalyticsEvent
        {
            AppId = request.AppId,
            EventType = request.EventType,
            UserId = userId,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            Referrer = referrer,
            SearchKeywords = request.SearchKeywords
        });
        
        // Notify dashboard in real-time
        await _hubContext.Clients.Group($"app-{request.AppId}")
            .SendAsync("EventTracked", request.EventType);
        
        return NoContent();
    }
    
    // Developer analytics (authenticated)
    public async Task<Response<List<AppAnalyticsResponse>>> GetMyAppsAnalytics(
    {
        var userId = GetUserId();
        var analytics = await _analyticsService.GetDeveloperAppsAnalyticsAsync(
            userId,
            startDate ?? DateTime.UtcNow.AddDays(-30),
            endDate ?? DateTime.UtcNow
        );
        return Ok(analytics);
    }
    
    public async Task<Response<AppAnalyticsDetail>> GetAppAnalytics(
        Guid appId,
    {
        var userId = GetUserId();
        
        // Verify developer owns this app
        if (!await _analyticsService.DeveloperOwnsAppAsync(userId, appId))
        {
            return Forbid();
        }
        
        var analytics = await _analyticsService.GetAppAnalyticsDetailAsync(
            appId,
            startDate ?? DateTime.UtcNow.AddDays(-30),
            endDate ?? DateTime.UtcNow
        );
        
        return Ok(analytics);
    }
    
    public async Task<Response<List<KeywordInsight>>> GetKeywordInsights(Guid appId)
    {
        var userId = GetUserId();
        
        if (!await _analyticsService.DeveloperOwnsAppAsync(userId, appId))
        {
            return Forbid();
        }
        
        var keywords = await _analyticsService.GetKeywordInsightsAsync(appId);
        return Ok(keywords);
    }
    
    public async Task<IResponse> ExportAnalytics(
        Guid appId,
    {
        var userId = GetUserId();
        
        if (!await _analyticsService.DeveloperOwnsAppAsync(userId, appId))
        {
            return Forbid();
        }
        
        var data = await _analyticsService.ExportAnalyticsAsync(
            appId,
            format,
            startDate ?? DateTime.UtcNow.AddDays(-90),
            endDate ?? DateTime.UtcNow
        );
        
        var contentType = format == "pdf" ? "application/pdf" : "text/csv";
        var fileName = $"analytics-{appId}-{DateTime.UtcNow:yyyyMMdd}.{format}";
        
        return File(data, contentType, fileName);
    }
}
```

### AnalyticsService
```python
public class AnalyticsService : IAnalyticsService
{
    
    public async Task TrackEventAsync(AnalyticsEvent analyticsEvent)
    {
        _context.AnalyticsEvents.Add(analyticsEvent);
        await _context.SaveChangesAsync();
        
        // Update daily summary asynchronously
        _ = Task.Run(() => UpdateDailySummaryAsync(analyticsEvent.AppId, analyticsEvent.Timestamp.Date));
    }
    
    public async Task<AppAnalyticsDetail> GetAppAnalyticsDetailAsync(
        Guid appId,
        DateTime startDate,
        DateTime endDate)
    {
        var events = await _context.AnalyticsEvents
            .Where(e => e.AppId == appId && e.Timestamp >= startDate && e.Timestamp <= endDate)
            .ToListAsync();
        
        var summaries = await _context.AppAnalyticsSummaries
            .Where(s => s.AppId == appId && s.Date >= startDate && s.Date <= endDate)
            .OrderBy(s => s.Date)
            .ToListAsync();
        
        return new AppAnalyticsDetail
        {
            AppId = appId,
            StartDate = startDate,
            EndDate = endDate,
            TotalPageViews = summaries.Sum(s => s.PageViews),
            TotalDetailViews = summaries.Sum(s => s.DetailViews),
            TotalStoreClicks = summaries.Sum(s => s.StoreClicks),
            TotalShares = summaries.Sum(s => s.Shares),
            DailyMetrics = summaries.Select(s => new DailyMetric
            {
                Date = s.Date,
                PageViews = s.PageViews,
                DetailViews = s.DetailViews,
                StoreClicks = s.StoreClicks
            }).ToList(),
            TopReferrers = events
                .Where(e => !string.IsNullOrEmpty(e.Referrer))
                .GroupBy(e => e.Referrer)
                .Select(g => new ReferrerStat
                {
                    Referrer = g.Key!,
                    Count = g.Count()
                })
                .OrderByDescending(r => r.Count)
                .Take(10)
                .ToList()
        };
    }
    
    public async Task<List<KeywordInsight>> GetKeywordInsightsAsync(Guid appId)
    {
        var keywords = await _context.AnalyticsEvents
            .Where(e => e.AppId == appId && !string.IsNullOrEmpty(e.SearchKeywords))
            .GroupBy(e => e.SearchKeywords)
            .Select(g => new KeywordInsight
            {
                Keyword = g.Key!,
                SearchCount = g.Count(),
                ClickThroughCount = g.Count(e => e.EventType == AnalyticsEventType.DetailView)
            })
            .OrderByDescending(k => k.SearchCount)
            .Take(50)
            .ToListAsync();
        
        // Calculate CTR
        foreach (var keyword in keywords)
        {
            keyword.ClickThroughRate = keyword.SearchCount > 0
                ? (double)keyword.ClickThroughCount / keyword.SearchCount * 100
                : 0;
        }
        
        return keywords;
    }
    
    private async Task UpdateDailySummaryAsync(Guid appId, DateTime date)
    {
        var summary = await _context.AppAnalyticsSummaries
            .FirstOrDefaultAsync(s => s.AppId == appId && s.Date == date);
        
        if (summary == null)
        {
            summary = new AppAnalyticsSummary { AppId = appId, Date = date };
            _context.AppAnalyticsSummaries.Add(summary);
        }
        
        var events = await _context.AnalyticsEvents
            .Where(e => e.AppId == appId && e.Timestamp.Date == date)
            .ToListAsync();
        
        summary.PageViews = events.Count(e => e.EventType == AnalyticsEventType.PageView);
        summary.DetailViews = events.Count(e => e.EventType == AnalyticsEventType.DetailView);
        summary.StoreClicks = events.Count(e => 
            e.EventType == AnalyticsEventType.GooglePlayClick ||
            e.EventType == AnalyticsEventType.AppStoreClick ||
            e.EventType == AnalyticsEventType.AppGalleryClick);
        summary.Shares = events.Count(e => e.EventType == AnalyticsEventType.ShareClick);
        summary.NewFavorites = events.Count(e => e.EventType == AnalyticsEventType.FavoriteAdd);
        summary.NewReviews = events.Count(e => e.EventType == AnalyticsEventType.ReviewSubmit);
        
        await _context.SaveChangesAsync();
    }
}
```

### Real-Time Analytics Hub (SignalR)
```python
public class AnalyticsHub : Hub
{
    public async Task SubscribeToApp(Guid appId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"app-{appId}");
    }
    
    public async Task UnsubscribeFromApp(Guid appId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"app-{appId}");
    }
}

// In Program.cs
builder.Services.AddSignalR();
app.MapHub<AnalyticsHub>("/hubs/analytics");
```

### Frontend Implementation
```typescript
// analytics.service.ts
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private hubConnection: signalR.HubConnection;
  
  trackEvent(appId: string, eventType: string, searchKeywords?: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/v1/analytics/track`, {
      appId,
      eventType,
      searchKeywords
    });
  }
  
  getAppAnalytics(appId: string, startDate: string, endDate: string): Observable<AppAnalyticsDetail> {
    return this.http.get<AppAnalyticsDetail>(
      `${this.baseUrl}/api/v1/analytics/app/${appId}`,
      { params: { startDate, endDate } }
    );
  }
  
  connectToRealTimeUpdates(appId: string): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.baseUrl}/hubs/analytics`)
      .build();
    
    this.hubConnection.start().then(() => {
      this.hubConnection.invoke('SubscribeToApp', appId);
    });
    
    this.hubConnection.on('EventTracked', (eventType) => {
      // Update dashboard in real-time
    });
  }
}

// Dashboard component with Chart.js
export class DeveloperDashboardComponent implements OnInit {
  chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'App Performance' }
    }
  };
  
  ngOnInit() {
    this.analyticsService.getAppAnalytics(this.appId, this.startDate, this.endDate)
      .subscribe(data => {
        this.renderCharts(data);
      });
    
    this.analyticsService.connectToRealTimeUpdates(this.appId);
  }
  
  renderCharts(data: AppAnalyticsDetail) {
    // Line chart for page views over time
    // Bar chart for event types
    // Pie chart for referrer distribution
  }
}
```

## Priority
priority-2 (Phase 3 - Developer Ecosystem)
