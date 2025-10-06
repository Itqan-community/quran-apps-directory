# US9.1: Create Review & Rating Entities

**Epic:** Epic 9 - User Reviews & Ratings System  
**Sprint:** Week 9, Day 1  
**Story Points:** 3  
**Priority:** P1  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Developer  
**I want** database entities for reviews and ratings  
**So that** users can submit and store app feedback

---

## 🎯 Acceptance Criteria

### AC1: Review Entity
- [ ] `Review` table created with:
  - Id (Guid), AppId (Guid), UserId (Guid)
  - Rating (decimal 1-5)
  - Comment (string, max 2000)
  - IsEdited (bool), CreatedAt, UpdatedAt
  - IsDeleted, IsModerated
  - HelpfulCount, UnhelpfulCount
- [ ] Foreign keys to Apps and Users
- [ ] Indexes on (AppId, CreatedAt) and (UserId)

### AC2: Rating Aggregation Logic
- [ ] Computed AverageRating on App entity
- [ ] RatingCount stored
- [ ] Triggers or background job to update aggregates
- [ ] Efficient calculation algorithm

### AC3: Review Voting Entity
- [ ] `ReviewVote` table for helpful/not helpful
- [ ] Fields: ReviewId, UserId, IsHelpful (bool)
- [ ] Prevents duplicate votes per user
- [ ] Updates Review.HelpfulCount

### AC4: Review Moderation Entity
- [ ] `ReviewModeration` table
- [ ] Fields: ReviewId, ModeratorId, Action (Approved/Rejected), Reason
- [ ] Tracks moderation history

### AC5: Database Migrations
- [ ] EF Core migration created
- [ ] All relationships configured
- [ ] Sample data seeding (optional)

---

## 📝 Technical Notes

### Review Entity
```csharp
public class Review
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid AppId { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [Range(1, 5)]
    public decimal Rating { get; set; }
    
    [MaxLength(2000)]
    public string Comment { get; set; }
    
    public bool IsEdited { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    public bool IsDeleted { get; set; }
    public bool IsModerated { get; set; }
    public bool IsApproved { get; set; }
    
    public int HelpfulCount { get; set; }
    public int UnhelpfulCount { get; set; }
    
    // Navigation properties
    public App App { get; set; }
    public ApplicationUser User { get; set; }
    public ICollection<ReviewVote> Votes { get; set; }
    public ICollection<ReviewModeration> ModerationHistory { get; set; }
}

public class ReviewVote
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid ReviewId { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    public bool IsHelpful { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public Review Review { get; set; }
    public ApplicationUser User { get; set; }
}

public class ReviewModeration
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid ReviewId { get; set; }
    
    [Required]
    public Guid ModeratorId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Action { get; set; } // Approved, Rejected, Flagged
    
    [MaxLength(500)]
    public string Reason { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public Review Review { get; set; }
    public ApplicationUser Moderator { get; set; }
}
```

### DbContext Configuration
```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // Review entity
    modelBuilder.Entity<Review>(entity =>
    {
        entity.HasKey(r => r.Id);
        
        entity.HasOne(r => r.App)
            .WithMany(a => a.Reviews)
            .HasForeignKey(r => r.AppId)
            .OnDelete(DeleteBehavior.Cascade);
        
        entity.HasOne(r => r.User)
            .WithMany(u => u.Reviews)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.SetNull);
        
        entity.HasIndex(r => new { r.AppId, r.CreatedAt });
        entity.HasIndex(r => r.UserId);
        
        entity.Property(r => r.Rating)
            .HasPrecision(2, 1); // e.g., 4.5
    });
    
    // ReviewVote entity
    modelBuilder.Entity<ReviewVote>(entity =>
    {
        entity.HasKey(v => v.Id);
        
        entity.HasOne(v => v.Review)
            .WithMany(r => r.Votes)
            .HasForeignKey(v => v.ReviewId)
            .OnDelete(DeleteBehavior.Cascade);
        
        entity.HasOne(v => v.User)
            .WithMany()
            .HasForeignKey(v => v.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        
        // Prevent duplicate votes
        entity.HasIndex(v => new { v.ReviewId, v.UserId })
            .IsUnique();
    });
    
    // ReviewModeration entity
    modelBuilder.Entity<ReviewModeration>(entity =>
    {
        entity.HasKey(m => m.Id);
        
        entity.HasOne(m => m.Review)
            .WithMany(r => r.ModerationHistory)
            .HasForeignKey(m => m.ReviewId)
            .OnDelete(DeleteBehavior.Cascade);
        
        entity.HasOne(m => m.Moderator)
            .WithMany()
            .HasForeignKey(m => m.ModeratorId)
            .OnDelete(DeleteBehavior.SetNull);
    });
    
    // Update App entity
    modelBuilder.Entity<App>(entity =>
    {
        entity.Property(a => a.AverageRating)
            .HasPrecision(2, 1);
    });
}
```

### Rating Aggregation Service
```csharp
public interface IRatingService
{
    Task RecalculateAppRatingAsync(Guid appId);
}

public class RatingService : IRatingService
{
    private readonly ApplicationDbContext _context;
    
    public async Task RecalculateAppRatingAsync(Guid appId)
    {
        var reviews = await _context.Reviews
            .Where(r => r.AppId == appId && !r.IsDeleted && r.IsApproved)
            .ToListAsync();
        
        if (!reviews.Any())
        {
            var app = await _context.Apps.FindAsync(appId);
            if (app != null)
            {
                app.AverageRating = null;
                app.RatingCount = 0;
                await _context.SaveChangesAsync();
            }
            return;
        }
        
        var averageRating = reviews.Average(r => r.Rating);
        var ratingCount = reviews.Count;
        
        await _context.Apps
            .Where(a => a.Id == appId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(a => a.AverageRating, averageRating)
                .SetProperty(a => a.RatingCount, ratingCount));
    }
}
```

---

## 🔗 Dependencies
- US8.1: ASP.NET Identity (ApplicationUser)
- US1.4: App entity defined

---

## 📊 Definition of Done
- [ ] All entities created
- [ ] Database migration applied
- [ ] Relationships configured
- [ ] Indexes created
- [ ] Rating aggregation logic working
- [ ] Unit tests for aggregation
- [ ] Documentation complete

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 9: User Reviews & Ratings](../epics/epic-9-user-reviews-ratings-system.md)
