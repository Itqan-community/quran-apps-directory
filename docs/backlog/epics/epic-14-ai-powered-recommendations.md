# Epic 14: AI-Powered Recommendations

## 📋 Epic Overview
Implement intelligent recommendation system using ML.NET to suggest personalized apps based on user behavior, preferences, and similar user patterns.

## 🎯 Goal
Increase app discovery and user engagement through personalized recommendations that match user needs and preferences.

## 📊 Success Metrics
- Recommendation click-through rate >20%
- 35% of discovered apps come from recommendations
- Recommendation relevance score >0.7
- A/B test shows 25% improvement in engagement
- 60% user satisfaction with recommendations

## 🏗️ Technical Scope (Django + AI/ML)
- User behavior tracking for ML
- Python ML libraries (scikit-learn, TensorFlow) recommendation model training
- Collaborative filtering implementation
- Content-based filtering
- Hybrid recommendation system
- A/B testing framework
- Real-time recommendation generation
- Model retraining pipeline

## 🔗 Dependencies
- Epic 8: User accounts and activity tracking
- Epic 12: Analytics data collection

## 📈 Business Value
- High: Differentiation and engagement
- Impact: Increases app discovery by 30%
- Effort: 2-3 days for MVP (simple model)

## ✅ Definition of Done
- Recommendation model trained
- Recommendations displayed on homepage
- Personalized recommendations for logged-in users
- Fallback for anonymous users (trending/popular)
- A/B testing framework operational
- Model accuracy >70%
- Performance <100ms for recommendations

## Related Stories
- US14.1: User Behavior Tracking for ML
- US14.2: Python ML Model Training Pipeline
- US14.3: Collaborative Filtering Implementation
- US14.4: Recommendation API Endpoints
- US14.5: A/B Testing Framework

## Django + AI/ML Implementation Details
### Entity Models
```csharp
public class UserBehavior
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid AppId { get; set; }
    public UserActionType ActionType { get; set; }
    public float Weight { get; set; } // Different actions have different weights
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    public ApplicationUser User { get; set; } = null!;
    public App App { get; set; } = null!;
}

public enum UserActionType
{
    View = 1,           // Weight: 1.0
    DetailView = 2,     // Weight: 2.0
    Favorite = 3,       // Weight: 5.0
    Review = 4,         // Weight: 7.0
    Download = 5        // Weight: 10.0
}

public class AppRecommendation
{
    public Guid UserId { get; set; }
    public Guid AppId { get; set; }
    public float Score { get; set; }
    public string RecommendationType { get; set; } = string.Empty; // "collaborative", "content", "hybrid"
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    
    public ApplicationUser User { get; set; } = null!;
    public App App { get; set; } = null!;
}
```

### ML.NET Model Classes
```csharp
public class AppRating
{
    [LoadColumn(0)]
    public float UserId { get; set; }
    
    [LoadColumn(1)]
    public float AppId { get; set; }
    
    [LoadColumn(2)]
    public float Label { get; set; } // Interaction score
}

public class AppRatingPrediction
{
    public float Label { get; set; }
    public float Score { get; set; }
}
```

### RecommendationsController
```csharp
[ApiController]
[Route("api/v1/[controller]")]
public class RecommendationsController : ControllerBase
{
    private readonly IRecommendationService _recommendationService;
    
    [HttpGet("for-you")]
    [Authorize]
    public async Task<ActionResult<List<AppResponse>>> GetPersonalizedRecommendations(
        [FromQuery] int count = 10)
    {
        var userId = GetUserId();
        var recommendations = await _recommendationService.GetPersonalizedRecommendationsAsync(userId, count);
        return Ok(recommendations);
    }
    
    [HttpGet("similar/{appId:guid}")]
    public async Task<ActionResult<List<AppResponse>>> GetSimilarApps(
        Guid appId,
        [FromQuery] int count = 5)
    {
        var similar = await _recommendationService.GetSimilarAppsAsync(appId, count);
        return Ok(similar);
    }
    
    [HttpGet("trending")]
    public async Task<ActionResult<List<AppResponse>>> GetTrendingApps([FromQuery] int count = 10)
    {
        var trending = await _recommendationService.GetTrendingAppsAsync(count);
        return Ok(trending);
    }
    
    [HttpGet("popular")]
    public async Task<ActionResult<List<AppResponse>>> GetPopularApps([FromQuery] int count = 10)
    {
        var popular = await _recommendationService.GetPopularAppsAsync(count);
        return Ok(popular);
    }
}
```

### RecommendationService with ML.NET
```csharp
public class RecommendationService : IRecommendationService
{
    private readonly ApplicationDbContext _context;
    private readonly MLContext _mlContext;
    private ITransformer _model;
    private readonly IMapper _mapper;
    
    public RecommendationService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
        _mlContext = new MLContext(seed: 0);
        LoadModel();
    }
    
    public async Task<List<AppResponse>> GetPersonalizedRecommendationsAsync(Guid userId, int count)
    {
        // Check if we have cached recommendations
        var cached = await _context.AppRecommendations
            .Where(r => r.UserId == userId && r.GeneratedAt > DateTime.UtcNow.AddHours(-1))
            .OrderByDescending(r => r.Score)
            .Take(count)
            .Include(r => r.App)
            .ThenInclude(a => a.Developer)
            .ToListAsync();
        
        if (cached.Any())
        {
            return _mapper.Map<List<AppResponse>>(cached.Select(c => c.App));
        }
        
        // Generate new recommendations
        return await GenerateRecommendationsAsync(userId, count);
    }
    
    private async Task<List<AppResponse>> GenerateRecommendationsAsync(Guid userId, int count)
    {
        // Get user's interaction history
        var userBehaviors = await _context.UserBehaviors
            .Where(b => b.UserId == userId)
            .Select(b => b.AppId)
            .Distinct()
            .ToListAsync();
        
        // Get all apps user hasn't interacted with
        var candidateApps = await _context.Apps
            .Where(a => !userBehaviors.Contains(a.Id))
            .ToListAsync();
        
        var recommendations = new List<(Guid AppId, float Score)>();
        
        // Use ML.NET model to predict scores
        if (_model != null)
        {
            var predictionEngine = _mlContext.Model.CreatePredictionEngine<AppRating, AppRatingPrediction>(_model);
            
            foreach (var app in candidateApps)
            {
                var prediction = predictionEngine.Predict(new AppRating
                {
                    UserId = GetUserIdHash(userId),
                    AppId = GetAppIdHash(app.Id),
                    Label = 0 // Not used for prediction
                });
                
                recommendations.Add((app.Id, prediction.Score));
            }
        }
        else
        {
            // Fallback to simple popularity-based recommendations
            recommendations = candidateApps
                .Select(a => (a.Id, Score: (float)(a.AppsAvgRating * a.TotalReviews)))
                .ToList();
        }
        
        // Get top recommendations
        var topRecommendations = recommendations
            .OrderByDescending(r => r.Score)
            .Take(count)
            .ToList();
        
        // Cache recommendations
        var recommendationEntities = topRecommendations.Select(r => new AppRecommendation
        {
            UserId = userId,
            AppId = r.AppId,
            Score = r.Score,
            RecommendationType = _model != null ? "collaborative" : "popularity"
        });
        
        await _context.AppRecommendations.AddRangeAsync(recommendationEntities);
        await _context.SaveChangesAsync();
        
        // Fetch full app data
        var appIds = topRecommendations.Select(r => r.AppId).ToList();
        var apps = await _context.Apps
            .Where(a => appIds.Contains(a.Id))
            .Include(a => a.Developer)
            .Include(a => a.Categories)
            .ToListAsync();
        
        return _mapper.Map<List<AppResponse>>(apps);
    }
    
    public async Task<List<AppResponse>> GetSimilarAppsAsync(Guid appId, int count)
    {
        // Content-based filtering: find apps with similar features
        var targetApp = await _context.Apps
            .Include(a => a.Categories)
            .Include(a => a.Features)
            .FirstOrDefaultAsync(a => a.Id == appId);
        
        if (targetApp == null)
            return new List<AppResponse>();
        
        var targetCategoryIds = targetApp.Categories.Select(c => c.Id).ToList();
        
        var similarApps = await _context.Apps
            .Where(a => a.Id != appId)
            .Include(a => a.Developer)
            .Include(a => a.Categories)
            .ToListAsync();
        
        // Calculate similarity scores
        var scored = similarApps.Select(app =>
        {
            var commonCategories = app.Categories.Count(c => targetCategoryIds.Contains(c.Id));
            var similarityScore = (float)commonCategories / targetCategoryIds.Count;
            return (App: app, Score: similarityScore);
        })
        .OrderByDescending(s => s.Score)
        .ThenByDescending(s => s.App.AppsAvgRating)
        .Take(count)
        .Select(s => s.App)
        .ToList();
        
        return _mapper.Map<List<AppResponse>>(scored);
    }
    
    public async Task TrainModelAsync()
    {
        // Get all user behaviors
        var behaviors = await _context.UserBehaviors
            .Select(b => new AppRating
            {
                UserId = GetUserIdHash(b.UserId),
                AppId = GetAppIdHash(b.AppId),
                Label = b.Weight
            })
            .ToListAsync();
        
        if (behaviors.Count < 100)
        {
            // Not enough data to train
            return;
        }
        
        var dataView = _mlContext.Data.LoadFromEnumerable(behaviors);
        
        // Split data
        var split = _mlContext.Data.TrainTestSplit(dataView, testFraction: 0.2);
        
        // Define pipeline
        var pipeline = _mlContext.Transforms.Conversion
            .MapValueToKey("userIdEncoded", "UserId")
            .Append(_mlContext.Transforms.Conversion.MapValueToKey("appIdEncoded", "AppId"))
            .Append(_mlContext.Recommendation().Trainers.MatrixFactorization(
                labelColumnName: "Label",
                matrixColumnIndexColumnName: "userIdEncoded",
                matrixRowIndexColumnName: "appIdEncoded",
                numberOfIterations: 20,
                approximationRank: 100));
        
        // Train model
        _model = pipeline.Fit(split.TrainSet);
        
        // Evaluate
        var predictions = _model.Transform(split.TestSet);
        var metrics = _mlContext.Regression.Evaluate(predictions, labelColumnName: "Label");
        
        // Save model
        _mlContext.Model.Save(_model, dataView.Schema, "recommendation-model.zip");
        
        Console.WriteLine($"Model trained - RMSE: {metrics.RootMeanSquaredError}");
    }
    
    private void LoadModel()
    {
        if (File.Exists("recommendation-model.zip"))
        {
            _model = _mlContext.Model.Load("recommendation-model.zip", out var schema);
        }
    }
    
    private float GetUserIdHash(Guid userId) => (float)Math.Abs(userId.GetHashCode()) % 1000000;
    private float GetAppIdHash(Guid appId) => (float)Math.Abs(appId.GetHashCode()) % 1000000;
}
```

### Background Model Training Job
```csharp
public class ModelTrainingBackgroundService : BackgroundService
{
    private readonly IServiceProvider _services;
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope = _services.CreateScope();
            var recommendationService = scope.ServiceProvider.GetRequiredService<IRecommendationService>();
            
            try
            {
                await recommendationService.TrainModelAsync();
            }
            catch (Exception ex)
            {
                // Log error
            }
            
            // Retrain model daily
            await Task.Delay(TimeSpan.FromDays(1), stoppingToken);
        }
    }
}

// Register in Program.cs
builder.Services.AddHostedService<ModelTrainingBackgroundService>();
```

### Frontend Implementation
```typescript
// recommendations.service.ts
@Injectable({ providedIn: 'root' })
export class RecommendationsService {
  getPersonalizedRecommendations(count: number = 10): Observable<App[]> {
    return this.http.get<App[]>(`${this.baseUrl}/api/v1/recommendations/for-you`, {
      params: { count }
    });
  }
  
  getSimilarApps(appId: string, count: number = 5): Observable<App[]> {
    return this.http.get<App[]>(`${this.baseUrl}/api/v1/recommendations/similar/${appId}`, {
      params: { count }
    });
  }
}

// Component
export class HomeComponent implements OnInit {
  recommendations$: Observable<App[]>;
  
  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.recommendations$ = this.recommendationsService.getPersonalizedRecommendations();
    } else {
      this.recommendations$ = this.recommendationsService.getTrendingApps();
    }
  }
}
```

### Required NuGet Packages
```xml
<PackageReference Include="Microsoft.ML" Version="3.0.0" />
<PackageReference Include="Microsoft.ML.Recommender" Version="0.21.0" />
```

## Priority
priority-2 (Phase 4 - Innovation)
