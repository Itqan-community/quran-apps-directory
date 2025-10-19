# US8.8: Implement Notification System (Django + Celery)

**Epic:** Epic 8 - User Accounts & Personalization
**Sprint:** Week 8, Day 2-3  
**Story Points:** 5  
**Priority:** P2  
**Assigned To:** Full Stack Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** to receive notifications about relevant activities  
**So that** I stay informed about new apps, reviews, and platform updates

---

## 🎯 Acceptance Criteria

### AC1: Notification Entity
- [ ] `Notification` table created
- [ ] Fields: UserId, Type, Title, Message, IsRead, CreatedAt, ActionUrl
- [ ] Notification types: NewApp, ReviewReply, SystemAnnouncement, etc.
- [ ] Soft delete support

### AC2: Notification Creation (Backend)
- [ ] `INotificationService` interface
- [ ] Methods: `CreateNotification`, `MarkAsRead`, `DeleteNotification`
- [ ] Batch notifications for multiple users
- [ ] Template-based notifications

### AC3: Notification Endpoints
- [ ] GET /api/users/me/notifications (paginated)
- [ ] GET /api/users/me/notifications/unread-count
- [ ] PUT /api/users/me/notifications/{id}/read
- [ ] DELETE /api/users/me/notifications/{id}
- [ ] POST /api/users/me/notifications/mark-all-read

### AC4: Notification Preferences
- [ ] User can configure notification types
- [ ] Email notifications opt-in
- [ ] In-app notifications always on
- [ ] Per-notification-type preferences

### AC5: Real-Time Notifications (SignalR)
- [ ] SignalR hub for real-time push
- [ ] Client auto-connects on login
- [ ] Toast notifications in UI
- [ ] Unread count badge updates live

### AC6: Email Notifications
- [ ] Daily digest option
- [ ] Immediate email for important notifications
- [ ] Unsubscribe link in emails

### AC7: Frontend Notification UI
- [ ] Notification bell icon in header
- [ ] Unread count badge
- [ ] Dropdown panel with recent notifications
- [ ] Mark as read on click
- [ ] "View all" link to notifications page

---

## 📝 Technical Notes

### Notification Entity
```python
public class Notification
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Type { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string Title { get; set; }
    
    [Required]
    [MaxLength(500)]
    public string Message { get; set; }
    
    public bool IsRead { get; set; }
    
    [MaxLength(500)]
    public string ActionUrl { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsDeleted { get; set; }
    
    // Navigation
    public ApplicationUser User { get; set; }
}

public static class NotificationTypes
{
    public const string NewApp = "new_app";
    public const string ReviewReply = "review_reply";
    public const string FavoriteAppUpdate = "favorite_app_update";
    public const string SystemAnnouncement = "system_announcement";
    public const string DeveloperMessage = "developer_message";
}
```

### Notification Service
```python
public interface INotificationService
{
    Task<Notification> CreateNotificationAsync(Guid userId, string type, 
        string title, string message, string actionUrl = null);
    Task CreateBulkNotificationsAsync(List<Guid> userIds, string type, 
        string title, string message, string actionUrl = null);
    Task<List<NotificationDto>> GetUserNotificationsAsync(Guid userId, int page, int pageSize);
    Task<int> GetUnreadCountAsync(Guid userId);
    Task MarkAsReadAsync(Guid notificationId);
    Task MarkAllAsReadAsync(Guid userId);
    Task DeleteNotificationAsync(Guid notificationId);
}

public class NotificationService : INotificationService
{
    
    public async Task<Notification> CreateNotificationAsync(
        Guid userId,
        string type,
        string title,
        string message,
        string actionUrl = null)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            ActionUrl = actionUrl,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        
        await _context.Notifications.AddAsync(notification);
        await _context.SaveChangesAsync();
        
        // Push real-time notification
        await _hubContext.Clients.User(userId.ToString())
            .SendAsync("ReceiveNotification", new
            {
                notification.Id,
                notification.Type,
                notification.Title,
                notification.Message,
                notification.ActionUrl,
                notification.CreatedAt
            });
        
        // Check if user wants email notifications
        var user = await _context.Users.FindAsync(userId);
        if (user?.EmailNotificationsEnabled == true)
        {
            await _emailService.SendNotificationEmailAsync(
                user.Email,
                title,
                message,
                actionUrl);
        }
        
        return notification;
    }
    
    public async Task CreateBulkNotificationsAsync(
        List<Guid> userIds,
        string type,
        string title,
        string message,
        string actionUrl = null)
    {
        var notifications = userIds.Select(userId => new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            ActionUrl = actionUrl,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }).ToList();
        
        await _context.Notifications.AddRangeAsync(notifications);
        await _context.SaveChangesAsync();
        
        // Push to all users (performance consideration for large lists)
        foreach (var userId in userIds)
        {
            await _hubContext.Clients.User(userId.ToString())
                .SendAsync("ReceiveNotification", new
                {
                    Type = type,
                    Title = title,
                    Message = message,
                    ActionUrl = actionUrl
                });
        }
    }
    
    public async Task<List<NotificationDto>> GetUserNotificationsAsync(
        Guid userId,
        int page,
        int pageSize)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsDeleted)
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = n.Type,
                Title = n.Title,
                Message = n.Message,
                IsRead = n.IsRead,
                ActionUrl = n.ActionUrl,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync();
        
        return notifications;
    }
    
    public async Task<int> GetUnreadCountAsync(Guid userId)
    {
        return await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead && !n.IsDeleted)
            .CountAsync();
    }
    
    public async Task MarkAsReadAsync(Guid notificationId)
    {
        var notification = await _context.Notifications.FindAsync(notificationId);
        if (notification != null)
        {
            notification.IsRead = true;
            await _context.SaveChangesAsync();
        }
    }
    
    public async Task MarkAllAsReadAsync(Guid userId)
    {
        await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
    }
}
```

### SignalR Hub
```python
public class NotificationsHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = request.user.id;
        
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, userId);
        }
        
        await base.OnConnectedAsync();
    }
    
    public override async Task OnDisconnectedAsync(Exception exception)
    {
        var userId = request.user.id;
        
        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, userId);
        }
        
        await base.OnDisconnectedAsync(exception);
    }
}

// Program.cs
builder.Services.AddSignalR();
app.MapHub<NotificationsHub>("/hubs/notifications");
```

### Frontend Notification Service
```typescript
import * as signalR from '@microsoft/signalr';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private hubConnection: signalR.HubConnection;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  
  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();
  
  constructor(
    private api: ApiService,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.connect();
        this.loadNotifications();
      } else {
        this.disconnect();
      }
    });
  }
  
  private connect(): void {
    const token = this.authService.getToken();
    
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/notifications`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();
    
    this.hubConnection.on('ReceiveNotification', (notification) => {
      this.notificationsSubject.next([notification, ...this.notificationsSubject.value]);
      this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
      
      // Show toast
      this.snackBar.open(notification.Title, 'View', {
        duration: 5000
      }).onAction().subscribe(() => {
        if (notification.ActionUrl) {
          this.router.navigate([notification.ActionUrl]);
        }
      });
    });
    
    this.hubConnection.start().catch(err => console.error('SignalR error:', err));
  }
  
  private disconnect(): void {
    this.hubConnection?.stop();
  }
  
  loadNotifications(page = 1, pageSize = 20): Observable<Notification[]> {
    return this.api.get<Notification[]>(`users/me/notifications?page=${page}&pageSize=${pageSize}`)
      .pipe(tap(notifications => this.notificationsSubject.next(notifications)));
  }
  
  loadUnreadCount(): Observable<number> {
    return this.api.get<{ count: number }>('users/me/notifications/unread-count')
      .pipe(
        map(response => response.count),
        tap(count => this.unreadCountSubject.next(count))
      );
  }
  
  markAsRead(notificationId: string): Observable<void> {
    return this.api.put<void>(`users/me/notifications/${notificationId}/read`, {})
      .pipe(tap(() => {
        const notifications = this.notificationsSubject.value;
        const index = notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
          notifications[index].isRead = true;
          this.notificationsSubject.next([...notifications]);
          this.unreadCountSubject.next(this.unreadCountSubject.value - 1);
        }
      }));
  }
  
  markAllAsRead(): Observable<void> {
    return this.api.post<void>('users/me/notifications/mark-all-read', {})
      .pipe(tap(() => {
        this.unreadCountSubject.next(0);
        this.loadNotifications();
      }));
  }
}
```

---

## 🔗 Dependencies
- US8.2: JWT Auth
- US8.4: User Profile

---

## 📊 Definition of Done
- [ ] Notification entity created
- [ ] Notification service implemented
- [ ] All endpoints working
- [ ] SignalR real-time push working
- [ ] Frontend notification UI complete
- [ ] Email notifications working
- [ ] Preferences configurable
- [ ] Performance tested

---

**Created:** October 6, 2025  
**Updated:** October 19, 2025 (Django alignment)**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 8: User Accounts & Personalization](../epics/epic-8-user-accounts-personalization.md)
