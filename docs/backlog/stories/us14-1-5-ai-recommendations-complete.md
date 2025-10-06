# US14.1-14.5: Complete AI-Powered Recommendations System

**Epic:** Epic 14 - AI-Powered Recommendations  
**Sprint:** Week 14, Day 1-4  
**Story Points:** 20 (combined)  
**Priority:** P2  
**Assigned To:** Backend + ML Engineer  
**Status:** Not Started

---

## 📋 Combined User Stories

Complete AI recommendation system using ML.NET, including behavior tracking, model training, recommendation engine, UI integration, and A/B testing.

---

## 🎯 Combined Acceptance Criteria

### User Behavior Tracking (AC1-AC5)
- [ ] UserBehavior entity (View, Click, Favorite, Share, Review)
- [ ] Weight system (View: 1, Click: 2, Favorite: 5, Review: 10)
- [ ] Implicit feedback collection
- [ ] Behavior aggregation
- [ ] Privacy-compliant tracking

### ML.NET Recommendation Model (AC6-AC10)
- [ ] MatrixFactorization algorithm implemented
- [ ] Training pipeline setup
- [ ] Model training on historical data
- [ ] Model evaluation metrics (RMSE, Precision@K)
- [ ] Model versioning and storage

### Recommendation Engine (AC11-AC16)
- [ ] Collaborative filtering implementation
- [ ] Content-based filtering implementation
- [ ] Hybrid approach (combine both)
- [ ] Cold start problem handling
- [ ] Real-time prediction API
- [ ] Background model retraining (weekly)

### UI Integration (AC17-AC22)
- [ ] "Recommended for You" section on homepage
- [ ] "Similar Apps" on app detail page
- [ ] Personalized search results boost
- [ ] Recommendation explanation (why this app?)
- [ ] Feedback mechanism (thumbs up/down)
- [ ] Loading states and fallbacks

### A/B Testing Framework (AC23-AC26)
- [ ] A/B test configuration entity
- [ ] User assignment to test groups
- [ ] Metrics tracking per variant
- [ ] Statistical significance calculation

---

## 📝 Technical Implementation

### User Behavior Entity
```csharp
public class UserBehavior
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    public Guid AppId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string BehaviorType { get; set; } // View, Click, Favorite, Share, Review
    
    public int Weight { get; set; } // Calculated based on behavior type
    
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public ApplicationUser User { get; set; }
    public App App { get; set; }
}

public static class BehaviorWeights
{
    public const int View = 1;
    public const int Click = 2;
    public const int Favorite = 5;
    public const int Share = 7;
    public const int Review = 10;
}
```

### ML.NET Recommendation Model
```csharp
public class AppRating
{
    [LoadColumn(0)]
    public string UserId { get; set; }
    
    [LoadColumn(1)]
    public string AppId { get; set; }
    
    [LoadColumn(2)]
    public float Score { get; set; }
}

public class AppRecommendationPrediction
{
    public float Score { get; set; }
}

public class RecommendationModelService
{
    private MLContext _mlContext;
    private ITransformer _model;
    private string _modelPath = "Models/recommendation_model.zip";
    
    public RecommendationModelService()
    {
        _mlContext = new MLContext();
        LoadModel();
    }
    
    public async Task TrainModelAsync()
    {
        // Get training data from database
        var trainingData = await GetTrainingDataAsync();
        
        var dataView = _mlContext.Data.LoadFromEnumerable(trainingData);
        
        // Define pipeline
        var pipeline = _mlContext.Transforms.Conversion.MapValueToKey(
                outputColumnName: "userIdEncoded",
                inputColumnName: nameof(AppRating.UserId))
            .Append(_mlContext.Transforms.Conversion.MapValueToKey(
                outputColumnName: "appIdEncoded",
                inputColumnName: nameof(AppRating.AppId)))
            .Append(_mlContext.Recommendation().Trainers.MatrixFactorization(
                labelColumnName: nameof(AppRating.Score),
                matrixColumnIndexColumnName: "userIdEncoded",
                matrixRowIndexColumnName: "appIdEncoded",
                numberOfIterations: 20,
                approximationRank: 100));
        
        // Train model
        _model = pipeline.Fit(dataView);
        
        // Save model
        _mlContext.Model.Save(_model, dataView.Schema, _modelPath);
        
        // Evaluate
        var metrics = _mlContext.Recommendation().Evaluate(
            _model.Transform(dataView),
            labelColumnName: nameof(AppRating.Score));
        
        _logger.LogInformation("Model trained. RMSE: {RMSE}, R-Squared: {RSquared}",
            metrics.RootMeanSquaredError, metrics.RSquared);
    }
    
    private async Task<List<AppRating>> GetTrainingDataAsync()
    {
        var behaviors = await _context.UserBehaviors
            .GroupBy(b => new { b.UserId, b.AppId })
            .Select(g => new AppRating
            {
                UserId = g.Key.UserId.ToString(),
                AppId = g.Key.AppId.ToString(),
                Score = g.Sum(b => b.Weight) // Aggregate weight
            })
            .ToListAsync();
        
        return behaviors;
    }
    
    private void LoadModel()
    {
        if (File.Exists(_modelPath))
        {
            _model = _mlContext.Model.Load(_modelPath, out _);
        }
    }
}
```

### Recommendation Engine Service
```csharp
public interface IRecommendationEngine
{
    Task<List<AppRecommendationDto>> GetRecommendationsForUserAsync(
        Guid userId, int count = 10);
    Task<List<AppRecommendationDto>> GetSimilarAppsAsync(
        Guid appId, int count = 5);
}

public class RecommendationEngine : IRecommendationEngine
{
    private readonly RecommendationModelService _modelService;
    private readonly ApplicationDbContext _context;
    
    public async Task<List<AppRecommendationDto>> GetRecommendationsForUserAsync(
        Guid userId,
        int count = 10)
    {
        // Check if user has enough behavior data
        var behaviorCount = await _context.UserBehaviors
            .Where(b => b.UserId == userId)
            .CountAsync();
        
        if (behaviorCount < 5)
        {
            // Cold start: return popular apps
            return await GetPopularAppsAsync(count);
        }
        
        // Get collaborative filtering recommendations
        var collaborativeRecs = await GetCollaborativeRecommendationsAsync(userId, count);
        
        // Get content-based recommendations
        var contentRecs = await GetContentBasedRecommendationsAsync(userId, count);
        
        // Hybrid: Combine both (70% collaborative, 30% content-based)
        var hybrid = collaborativeRecs
            .Take(count * 7 / 10)
            .Concat(contentRecs.Take(count * 3 / 10))
            .Distinct()
            .Take(count)
            .ToList();
        
        return hybrid;
    }
    
    private async Task<List<AppRecommendationDto>> GetCollaborativeRecommendationsAsync(
        Guid userId,
        int count)
    {
        // Use ML.NET model for predictions
        var allApps = await _context.Apps
            .Where(a => a.IsActive && !a.IsDeleted)
            .Select(a => a.Id)
            .ToListAsync();
        
        var predictions = new List<(Guid AppId, float Score)>();
        
        var predictionEngine = _mlContext.Model.CreatePredictionEngine<AppRating, AppRecommendationPrediction>(_model);
        
        foreach (var appId in allApps)
        {
            var input = new AppRating
            {
                UserId = userId.ToString(),
                AppId = appId.ToString()
            };
            
            var prediction = predictionEngine.Predict(input);
            predictions.Add((appId, prediction.Score));
        }
        
        var topPredictions = predictions
            .OrderByDescending(p => p.Score)
            .Take(count)
            .Select(p => p.AppId)
            .ToList();
        
        return await GetAppDetailsAsync(topPredictions);
    }
    
    private async Task<List<AppRecommendationDto>> GetContentBasedRecommendationsAsync(
        Guid userId,
        int count)
    {
        // Get user's favorite categories
        var favoriteCategories = await _context.Favorites
            .Where(f => f.UserId == userId)
            .SelectMany(f => f.App.AppCategories)
            .GroupBy(ac => ac.CategoryId)
            .OrderByDescending(g => g.Count())
            .Take(3)
            .Select(g => g.Key)
            .ToListAsync();
        
        // Find apps in those categories
        var recommendedApps = await _context.Apps
            .Where(a => a.IsActive && 
                       !a.IsDeleted &&
                       a.AppCategories.Any(ac => favoriteCategories.Contains(ac.CategoryId)))
            .OrderByDescending(a => a.AverageRating)
            .Take(count)
            .Select(a => a.Id)
            .ToListAsync();
        
        return await GetAppDetailsAsync(recommendedApps);
    }
    
    public async Task<List<AppRecommendationDto>> GetSimilarAppsAsync(
        Guid appId,
        int count = 5)
    {
        var app = await _context.Apps
            .Include(a => a.AppCategories)
            .FirstOrDefaultAsync(a => a.Id == appId);
        
        if (app == null)
            return new List<AppRecommendationDto>();
        
        var categoryIds = app.AppCategories.Select(ac => ac.CategoryId).ToList();
        
        // Find apps in same categories
        var similarApps = await _context.Apps
            .Where(a => a.Id != appId &&
                       a.IsActive &&
                       !a.IsDeleted &&
                       a.AppCategories.Any(ac => categoryIds.Contains(ac.CategoryId)))
            .OrderByDescending(a => a.AverageRating)
            .Take(count)
            .Select(a => a.Id)
            .ToListAsync();
        
        return await GetAppDetailsAsync(similarApps);
    }
    
    private async Task<List<AppRecommendationDto>> GetPopularAppsAsync(int count)
    {
        var popularApps = await _context.Apps
            .Where(a => a.IsActive && !a.IsDeleted)
            .OrderByDescending(a => a.AverageRating)
            .ThenByDescending(a => a.RatingCount)
            .Take(count)
            .Select(a => a.Id)
            .ToListAsync();
        
        return await GetAppDetailsAsync(popularApps);
    }
}
```

### Recommendations Controller
```csharp
[ApiController]
[Route("api/recommendations")]
public class RecommendationsController : ControllerBase
{
    private readonly IRecommendationEngine _recommendationEngine;
    
    [HttpGet("for-you")]
    [Authorize]
    public async Task<ActionResult<List<AppRecommendationDto>>> GetRecommendations(
        [FromQuery] int count = 10)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var recommendations = await _recommendationEngine.GetRecommendationsForUserAsync(
            Guid.Parse(userId), count);
        
        return Ok(recommendations);
    }
    
    [HttpGet("similar/{appId:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<List<AppRecommendationDto>>> GetSimilarApps(
        Guid appId,
        [FromQuery] int count = 5)
    {
        var similar = await _recommendationEngine.GetSimilarAppsAsync(appId, count);
        
        return Ok(similar);
    }
}
```

### Frontend - Recommendations Component
```typescript
@Component({
  selector: 'app-recommendations',
  template: `
    <section class="recommendations">
      <h2>Recommended for You</h2>
      
      <div class="apps-grid" *ngIf="!isLoading && recommendations.length > 0">
        <app-card *ngFor="let app of recommendations" [app]="app"></app-card>
      </div>
      
      <div *ngIf="isLoading">
        <mat-spinner></mat-spinner>
      </div>
      
      <div *ngIf="!isLoading && recommendations.length === 0" class="empty-state">
        <p>No recommendations yet. Browse some apps to get personalized suggestions!</p>
      </div>
    </section>
  `
})
export class RecommendationsComponent implements OnInit {
  recommendations: App[] = [];
  isLoading = true;
  
  constructor(
    private recommendationService: RecommendationService,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.loadRecommendations();
    } else {
      this.loadPopularApps();
    }
  }
  
  loadRecommendations(): void {
    this.recommendationService.getRecommendationsForUser().subscribe({
      next: (apps) => {
        this.recommendations = apps;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadPopularApps(); // Fallback
      }
    });
  }
  
  loadPopularApps(): void {
    this.appsService.getApps(1, 10, 'rating', 'desc').subscribe({
      next: (result) => {
        this.recommendations = result.items;
        this.isLoading = false;
      }
    });
  }
}
```

### Background Model Retraining Job
```csharp
public class ModelRetrainingJob : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ModelRetrainingJob> _logger;
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var modelService = scope.ServiceProvider.GetRequiredService<RecommendationModelService>();
                
                _logger.LogInformation("Starting model retraining...");
                
                await modelService.TrainModelAsync();
                
                _logger.LogInformation("Model retraining completed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during model retraining");
            }
            
            // Retrain weekly
            await Task.Delay(TimeSpan.FromDays(7), stoppingToken);
        }
    }
}

// Register in Program.cs
builder.Services.AddHostedService<ModelRetrainingJob>();
```

---

## 🔗 Dependencies
- US8.1: User authentication
- US8.7: User behavior tracking
- ML.NET NuGet package
- Sufficient training data (minimum 100 users with 5+ behaviors each)

---

## 📊 Definition of Done
- [ ] User behavior tracking working
- [ ] ML.NET model training pipeline complete
- [ ] Recommendation engine implemented (collaborative + content-based)
- [ ] Cold start problem handled
- [ ] API endpoints functional
- [ ] Frontend recommendations displaying
- [ ] Similar apps feature working
- [ ] Background retraining job scheduled
- [ ] Model performance metrics tracked
- [ ] A/B testing framework in place

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 14: AI-Powered Recommendations](../epics/epic-14-ai-powered-recommendations.md)
