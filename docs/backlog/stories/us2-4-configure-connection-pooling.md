# US2.4: Configure Npgsql Connection Pooling

**Epic:** Epic 2 - Backend Infrastructure Setup  
**Sprint:** Week 1, Day 4  
**Story Points:** 3  
**Priority:** P1  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Developer  
**I want to** configure optimal Npgsql connection pooling settings  
**So that** the API can handle 100+ concurrent requests efficiently without connection exhaustion

---

## 🎯 Acceptance Criteria

### AC1: Connection String Optimized
- [ ] Connection pooling parameters configured:
  ```
  Host=xxx;Database=xxx;Username=xxx;Password=xxx;
  Pooling=true;
  Minimum Pool Size=5;
  Maximum Pool Size=100;
  Connection Idle Lifetime=300;
  Connection Pruning Interval=10;
  ```

### AC2: Load Testing Performed
- [ ] 100 concurrent requests tested successfully
- [ ] Connection pool metrics monitored
- [ ] No connection timeouts observed
- [ ] Performance benchmarks met (<100ms response time)

### AC3: Monitoring Configured
- [ ] Connection pool stats logged
- [ ] Alerts configured for pool exhaustion
- [ ] Dashboard created for monitoring

### AC4: Documentation Updated
- [ ] Connection pooling guide documented
- [ ] Troubleshooting tips added
- [ ] Team trained on pool monitoring

---

## 📝 Technical Notes

### Optimal Settings
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=db.railway.app;Database=railway;Username=postgres;Password=***;Pooling=true;Minimum Pool Size=5;Maximum Pool Size=100;Connection Idle Lifetime=300;Connection Pruning Interval=10;Enlist=true;Timeout=30;Command Timeout=30"
  }
}
```

### Monitoring Code
```csharp
public class ConnectionPoolMonitor : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var stats = NpgsqlConnection.ClearPool(dataSource);
            _logger.LogInformation("Pool stats: {Stats}", stats);
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}
```

---

## 🔗 Dependencies
- US2.1: Database Server Setup
- US2.3: Create ASP.NET Core API

---

## 📊 Definition of Done
- [ ] Connection pooling configured
- [ ] Load testing passed
- [ ] Monitoring operational
- [ ] Documentation complete

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 2: Backend Infrastructure Setup](../epics/epic-2-backend-infrastructure-setup.md)

