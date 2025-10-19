# US9.5: Implement Helpful/Unhelpful Voting

**Epic:** Epic 9 - User Reviews & Ratings System  
**Sprint:** Week 9, Day 3-4  
**Story Points:** 3  
**Priority:** P2  
**Assigned To:** Full Stack Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** to mark reviews as helpful or not helpful  
**So that** useful reviews are highlighted and others can benefit

---

## 🎯 Acceptance Criteria

### AC1: Vote on Review Endpoint
- [ ] POST /api/reviews/{id}/vote
- [ ] Accepts: isHelpful (boolean)
- [ ] Requires authentication
- [ ] One vote per user per review
- [ ] Updates review helpful/unhelpful counts

### AC2: Get User's Vote
- [ ] GET /api/reviews/{id}/my-vote
- [ ] Returns user's vote if exists
- [ ] Used to highlight voted state in UI

### AC3: Update Vote
- [ ] User can change vote (helpful → unhelpful)
- [ ] Updates counts accordingly
- [ ] Previous vote removed, new vote added

### AC4: Remove Vote
- [ ] DELETE /api/reviews/{id}/vote
- [ ] Removes user's vote
- [ ] Updates counts

### AC5: Vote Counts Display
- [ ] Helpful count shown on review cards
- [ ] "Most Helpful" sorting option
- [ ] Visual indication of user's vote

### AC6: Validation
- [ ] Cannot vote on own review
- [ ] Rate limiting: 100 votes per day per user

---

## 📝 Technical Notes

### ViewSet
```python
class ReviewVotingViewSet(viewsets.ModelViewSet):
{
    
    def  VoteOnReview(
        Guid reviewId,
    {
        var userId = request.user.id;
        
        // Check if voting on own review
        var review = await _context.Reviews.FindAsync(reviewId);
        if (review.UserId.ToString() == userId)
        
        await _votingService.VoteAsync(
            reviewId,
            uuid.UUID(userId),
            dto.IsHelpful);
        
        return Ok(new { message = "Vote recorded" });
    }
    
    def <VoteDto>> GetMyVote(Guid reviewId)
    {
        var userId = request.user.id;
        
        var vote = await _votingService.GetUserVoteAsync(
            reviewId,
            uuid.UUID(userId));
        
        if (vote == null)
        
        return Ok(new VoteDto { IsHelpful = vote.IsHelpful });
    }
    
    def  RemoveVote(Guid reviewId)
    {
        var userId = request.user.id;
        
        await _votingService.RemoveVoteAsync(
            reviewId,
            uuid.UUID(userId));
        
    }
}
```

### Voting Service
```python
public interface IReviewVotingService
{
    Task VoteAsync(Guid reviewId, Guid userId, bool isHelpful);
    Task<ReviewVote> GetUserVoteAsync(Guid reviewId, Guid userId);
    Task RemoveVoteAsync(Guid reviewId, Guid userId);
}

public class ReviewVotingService : IReviewVotingService
{
    public async Task VoteAsync(Guid reviewId, Guid userId, bool isHelpful)
    {
        // Check for existing vote
        var existingVote = await _context.ReviewVotes
            .FirstOrDefaultAsync(v => v.ReviewId == reviewId && v.UserId == userId);
        
        if (existingVote != null)
        {
            // Update existing vote
            if (existingVote.IsHelpful != isHelpful)
            {
                // Decrement old count, increment new count
                var review = await _context.Reviews.FindAsync(reviewId);
                
                if (existingVote.IsHelpful)
                {
                    review.HelpfulCount--;
                    review.UnhelpfulCount++;
                }
                else
                {
                    review.UnhelpfulCount--;
                    review.HelpfulCount++;
                }
                
                existingVote.IsHelpful = isHelpful;
                existingVote.CreatedAt = DateTime.UtcNow;
            }
        }
        else
        {
            // Create new vote
            var vote = new ReviewVote
            {
                Id = Guid.NewGuid(),
                ReviewId = reviewId,
                UserId = userId,
                IsHelpful = isHelpful,
                CreatedAt = DateTime.UtcNow
            };
            
            await _context.ReviewVotes.AddAsync(vote);
            
            // Update count
            var review = await _context.Reviews.FindAsync(reviewId);
            if (isHelpful)
                review.HelpfulCount++;
            else
                review.UnhelpfulCount++;
        }
        
        await _context.SaveChangesAsync();
    }
    
    public async Task RemoveVoteAsync(Guid reviewId, Guid userId)
    {
        var vote = await _context.ReviewVotes
            .FirstOrDefaultAsync(v => v.ReviewId == reviewId && v.UserId == userId);
        
        if (vote != null)
        {
            _context.ReviewVotes.Remove(vote);
            
            // Update count
            var review = await _context.Reviews.FindAsync(reviewId);
            if (vote.IsHelpful)
                review.HelpfulCount--;
            else
                review.UnhelpfulCount--;
            
            await _context.SaveChangesAsync();
        }
    }
}
```

### Frontend Integration
```typescript
@Injectable({ providedIn: 'root' })
export class ReviewVotingService {
  constructor(private api: ApiService) {}
  
  voteHelpful(reviewId: string): Observable<void> {
    return this.api.post<void>(
      `reviews/${reviewId}/vote`,
      { isHelpful: true }
    );
  }
  
  voteUnhelpful(reviewId: string): Observable<void> {
    return this.api.post<void>(
      `reviews/${reviewId}/vote`,
      { isHelpful: false }
    );
  }
  
  removeVote(reviewId: string): Observable<void> {
    return this.api.delete(`reviews/${reviewId}/vote`);
  }
  
  getMyVote(reviewId: string): Observable<{ isHelpful: boolean } | null> {
    return this.api.get<{ isHelpful: boolean }>(`reviews/${reviewId}/vote`)
      .pipe(catchError(() => of(null)));
  }
}
```

---

## 🔗 Dependencies
- US9.2: Review submission API
- US9.3: Review UI components

---

## 📊 Definition of Done
- [ ] Voting endpoints implemented
- [ ] Vote counts update correctly
- [ ] User can change/remove vote
- [ ] Frontend buttons functional
- [ ] Visual indication of votes
- [ ] Rate limiting enforced
- [ ] Unit tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 9: User Reviews & Ratings](../epics/epic-9-user-reviews-ratings-system.md)
