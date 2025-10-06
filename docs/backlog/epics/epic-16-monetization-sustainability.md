# Epic 16: Monetization & Sustainability

## 📋 Epic Overview
Implement ethical monetization strategies to ensure platform long-term sustainability while maintaining free access to core features and transparency with the community.

## 🎯 Goal
Generate sustainable revenue to support platform growth, infrastructure costs, and team expansion while maintaining Islamic values and community trust.

## 📊 Success Metrics
- 10% developer adoption of premium features
- 5% user donation rate
- Zero negative community feedback on monetization
- 100% transparency in financial reporting
- Revenue covers 100% of infrastructure costs

## 🏗️ Technical Scope (.NET 9)
- Stripe payment integration
- Donation system (one-time & recurring)
- Premium developer features (priority listings, analytics)
- Sponsored app placements (clearly labeled)
- Financial transparency dashboard
- Payment webhook handling
- Invoice generation
- Subscription management

## 🔗 Dependencies
- Epic 11: Developer portal
- Epic 2: Payment infrastructure

## 📈 Business Value
- Critical: Long-term viability
- Impact: Enables continued growth
- Effort: 3-4 days for MVP

## ✅ Definition of Done
- Stripe integration functional
- Donation page live
- Premium developer tiers available
- Sponsored placements implemented
- Transparency dashboard public
- Payment webhooks handling subscriptions
- Invoices auto-generated
- Sadaqah Jariyah framing implemented

## Related Stories
- US16.1: Stripe Payment Integration
- US16.2: Donation System (One-time & Recurring)
- US16.3: Premium Developer Features
- US16.4: Sponsored App Placements
- US16.5: Financial Transparency Dashboard
- US16.6: Subscription Management

## .NET 9 Implementation Details
### Entity Models
```csharp
public class Donation
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; } // Anonymous donations allowed
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public DonationType Type { get; set; }
    public DonationStatus Status { get; set; } = DonationStatus.Pending;
    public string? StripePaymentIntentId { get; set; }
    public string? StripeSubscriptionId { get; set; } // For recurring
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    
    public ApplicationUser? User { get; set; }
}

public enum DonationType
{
    OneTime,
    Monthly,
    Yearly
}

public enum DonationStatus
{
    Pending,
    Completed,
    Failed,
    Refunded,
    Cancelled
}

public class DeveloperSubscription
{
    public Guid Id { get; set; }
    public Guid DeveloperId { get; set; }
    public SubscriptionTier Tier { get; set; }
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;
    public decimal MonthlyPrice { get; set; }
    public string? StripeSubscriptionId { get; set; }
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? EndDate { get; set; }
    public DateTime? CancelledAt { get; set; }
    
    public DeveloperProfile Developer { get; set; } = null!;
}

public enum SubscriptionTier
{
    Free,           // $0 - Basic features
    Professional,   // $19/month - Priority support, advanced analytics
    Enterprise      // $49/month - All features, white-label, API access
}

public enum SubscriptionStatus
{
    Active,
    Cancelled,
    PastDue,
    Expired
}

public class SponsoredPlacement
{
    public Guid Id { get; set; }
    public Guid AppId { get; set; }
    public Guid DeveloperId { get; set; }
    public SponsorshipType Type { get; set; }
    public decimal Cost { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int ImpressionsTarget { get; set; }
    public int ImpressionsServed { get; set; }
    public int ClicksReceived { get; set; }
    public bool IsActive { get; set; } = true;
    
    public App App { get; set; } = null!;
    public DeveloperProfile Developer { get; set; } = null!;
}

public enum SponsorshipType
{
    HomepageFeatured,   // $99/week
    CategoryTop,        // $49/week
    SearchPriority      // $29/week
}
```

### PaymentsController
```csharp
[ApiController]
[Route("api/v1/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly IConfiguration _configuration;
    
    [HttpPost("donations/create-intent")]
    public async Task<ActionResult<CreatePaymentIntentResponse>> CreateDonationIntent(
        [FromBody] CreateDonationRequest request)
    {
        var userId = User.Identity?.IsAuthenticated == true ? GetUserId() : (Guid?)null;
        
        var paymentIntent = await _paymentService.CreateDonationPaymentIntentAsync(
            userId,
            request.Amount,
            request.Currency,
            request.Type
        );
        
        return Ok(new CreatePaymentIntentResponse
        {
            ClientSecret = paymentIntent.ClientSecret,
            PublishableKey = _configuration["Stripe:PublishableKey"]
        });
    }
    
    [HttpPost("donations/webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleStripeWebhook()
    {
        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
        var stripeSignature = Request.Headers["Stripe-Signature"];
        
        try
        {
            var stripeEvent = EventUtility.ConstructEvent(
                json,
                stripeSignature,
                _configuration["Stripe:WebhookSecret"]
            );
            
            await _paymentService.HandleStripeWebhookAsync(stripeEvent);
            
            return Ok();
        }
        catch (StripeException)
        {
            return BadRequest();
        }
    }
    
    [Authorize(Roles = "Developer")]
    [HttpPost("subscriptions/create")]
    public async Task<ActionResult<CreateSubscriptionResponse>> CreateDeveloperSubscription(
        [FromBody] CreateSubscriptionRequest request)
    {
        var developerId = GetUserId();
        
        var subscription = await _paymentService.CreateDeveloperSubscriptionAsync(
            developerId,
            request.Tier,
            request.PaymentMethodId
        );
        
        return Ok(subscription);
    }
    
    [Authorize(Roles = "Developer")]
    [HttpPost("subscriptions/{subscriptionId}/cancel")]
    public async Task<IActionResult> CancelSubscription(Guid subscriptionId)
    {
        var developerId = GetUserId();
        await _paymentService.CancelSubscriptionAsync(subscriptionId, developerId);
        return NoContent();
    }
    
    [Authorize(Roles = "Developer")]
    [HttpPost("sponsored-placements/create")]
    public async Task<ActionResult<SponsoredPlacementResponse>> CreateSponsoredPlacement(
        [FromBody] CreateSponsoredPlacementRequest request)
    {
        var developerId = GetUserId();
        
        var placement = await _paymentService.CreateSponsoredPlacementAsync(
            developerId,
            request.AppId,
            request.Type,
            request.DurationDays
        );
        
        return Ok(placement);
    }
    
    [HttpGet("transparency")]
    [AllowAnonymous]
    public async Task<ActionResult<FinancialTransparencyResponse>> GetFinancialTransparency()
    {
        var transparency = await _paymentService.GetFinancialTransparencyAsync();
        return Ok(transparency);
    }
}
```

### PaymentService
```csharp
public class PaymentService : IPaymentService
{
    private readonly ApplicationDbContext _context;
    private readonly StripeClient _stripeClient;
    
    public PaymentService(ApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        StripeConfiguration.ApiKey = configuration["Stripe:SecretKey"];
        _stripeClient = new StripeClient(StripeConfiguration.ApiKey);
    }
    
    public async Task<PaymentIntent> CreateDonationPaymentIntentAsync(
        Guid? userId,
        decimal amount,
        string currency,
        DonationType type)
    {
        var donation = new Donation
        {
            UserId = userId,
            Amount = amount,
            Currency = currency,
            Type = type,
            Status = DonationStatus.Pending
        };
        
        _context.Donations.Add(donation);
        await _context.SaveChangesAsync();
        
        var options = new PaymentIntentCreateOptions
        {
            Amount = (long)(amount * 100), // Convert to cents
            Currency = currency.ToLower(),
            Metadata = new Dictionary<string, string>
            {
                { "donation_id", donation.Id.ToString() },
                { "type", type.ToString() }
            }
        };
        
        var service = new PaymentIntentService(_stripeClient);
        var paymentIntent = await service.CreateAsync(options);
        
        donation.StripePaymentIntentId = paymentIntent.Id;
        await _context.SaveChangesAsync();
        
        return paymentIntent;
    }
    
    public async Task HandleStripeWebhookAsync(Event stripeEvent)
    {
        switch (stripeEvent.Type)
        {
            case Events.PaymentIntentSucceeded:
                var paymentIntent = stripeEvent.Data.Object as PaymentIntent;
                await HandlePaymentSucceededAsync(paymentIntent!);
                break;
                
            case Events.CustomerSubscriptionDeleted:
                var subscription = stripeEvent.Data.Object as Subscription;
                await HandleSubscriptionCancelledAsync(subscription!);
                break;
                
            case Events.InvoicePaymentSucceeded:
                var invoice = stripeEvent.Data.Object as Invoice;
                await HandleInvoicePaymentSucceededAsync(invoice!);
                break;
        }
    }
    
    private async Task HandlePaymentSucceededAsync(PaymentIntent paymentIntent)
    {
        var donationId = Guid.Parse(paymentIntent.Metadata["donation_id"]);
        var donation = await _context.Donations.FindAsync(donationId);
        
        if (donation != null)
        {
            donation.Status = DonationStatus.Completed;
            donation.CompletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            // Send thank you email
            if (donation.UserId.HasValue)
            {
                var user = await _context.Users.FindAsync(donation.UserId.Value);
                // await _emailService.SendDonationThankYouAsync(user!.Email!, donation.Amount);
            }
        }
    }
    
    public async Task<DeveloperSubscriptionResponse> CreateDeveloperSubscriptionAsync(
        Guid developerId,
        SubscriptionTier tier,
        string paymentMethodId)
    {
        var prices = new Dictionary<SubscriptionTier, decimal>
        {
            { SubscriptionTier.Free, 0 },
            { SubscriptionTier.Professional, 19 },
            { SubscriptionTier.Enterprise, 49 }
        };
        
        if (tier == SubscriptionTier.Free)
        {
            throw new BadRequestException("Cannot create subscription for free tier");
        }
        
        var developer = await _context.DeveloperProfiles
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.UserId == developerId);
        
        if (developer == null)
        {
            throw new NotFoundException("Developer not found");
        }
        
        // Create Stripe customer if doesn't exist
        var customerService = new CustomerService(_stripeClient);
        var customer = await customerService.CreateAsync(new CustomerCreateOptions
        {
            Email = developer.User.Email,
            PaymentMethod = paymentMethodId,
            InvoiceSettings = new CustomerInvoiceSettingsOptions
            {
                DefaultPaymentMethod = paymentMethodId
            }
        });
        
        // Create Stripe subscription
        var subscriptionService = new SubscriptionService(_stripeClient);
        var stripePriceId = _configuration[$"Stripe:Prices:{tier}"];
        
        var stripeSubscription = await subscriptionService.CreateAsync(new SubscriptionCreateOptions
        {
            Customer = customer.Id,
            Items = new List<SubscriptionItemOptions>
            {
                new() { Price = stripePriceId }
            },
            PaymentBehavior = "default_incomplete",
            Metadata = new Dictionary<string, string>
            {
                { "developer_id", developerId.ToString() },
                { "tier", tier.ToString() }
            }
        });
        
        // Save to database
        var subscription = new DeveloperSubscription
        {
            DeveloperId = developerId,
            Tier = tier,
            MonthlyPrice = prices[tier],
            StripeSubscriptionId = stripeSubscription.Id,
            Status = SubscriptionStatus.Active
        };
        
        _context.DeveloperSubscriptions.Add(subscription);
        await _context.SaveChangesAsync();
        
        return new DeveloperSubscriptionResponse
        {
            Id = subscription.Id,
            Tier = tier,
            MonthlyPrice = prices[tier],
            Status = SubscriptionStatus.Active,
            StartDate = subscription.StartDate
        };
    }
    
    public async Task<FinancialTransparencyResponse> GetFinancialTransparencyAsync()
    {
        var currentMonth = DateTime.UtcNow;
        var lastMonth = currentMonth.AddMonths(-1);
        
        var monthlyDonations = await _context.Donations
            .Where(d => d.Status == DonationStatus.Completed && 
                       d.CompletedAt >= lastMonth && 
                       d.CompletedAt < currentMonth)
            .SumAsync(d => d.Amount);
        
        var monthlySubscriptions = await _context.DeveloperSubscriptions
            .Where(s => s.Status == SubscriptionStatus.Active)
            .SumAsync(s => s.MonthlyPrice);
        
        var monthlySponsored = await _context.SponsoredPlacements
            .Where(sp => sp.StartDate >= lastMonth && sp.StartDate < currentMonth)
            .SumAsync(sp => sp.Cost);
        
        var totalRevenue = monthlyDonations + monthlySubscriptions + monthlySponsored;
        
        return new FinancialTransparencyResponse
        {
            Month = lastMonth.ToString("MMMM yyyy"),
            TotalRevenue = totalRevenue,
            DonationRevenue = monthlyDonations,
            SubscriptionRevenue = monthlySubscriptions,
            SponsoredRevenue = monthlySponsored,
            InfrastructureCosts = 150, // From hosting bills
            TeamCosts = 0, // Currently volunteer
            SurplusDeficit = totalRevenue - 150,
            Message = "All surplus goes towards improving the platform and supporting open-source Quran app development."
        };
    }
}
```

### Frontend Donation Page
```typescript
// donation.component.ts
@Component({
  selector: 'app-donation',
  templateUrl: './donation.component.html'
})
export class DonationComponent implements OnInit {
  stripe: Stripe;
  elements: StripeElements;
  
  donationForm = this.fb.group({
    amount: [25, [Validators.required, Validators.min(1)]],
    type: ['one-time', Validators.required]
  });
  
  async ngOnInit() {
    this.stripe = await loadStripe(environment.stripePublishableKey);
  }
  
  async submitDonation() {
    const { amount, type } = this.donationForm.value;
    
    // Create payment intent
    const { clientSecret } = await this.paymentService
      .createDonationIntent(amount, 'usd', type)
      .toPromise();
    
    // Confirm payment
    const { error } = await this.stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: this.cardElement,
        billing_details: { name: this.user?.name }
      }
    });
    
    if (error) {
      this.message.error(error.message);
    } else {
      this.message.success('Jazakallah Khairan for your donation!');
      this.router.navigate(['/donation/success']);
    }
  }
}
```

### Financial Transparency Dashboard
```typescript
// transparency.component.ts
export class TransparencyComponent implements OnInit {
  transparency$: Observable<FinancialTransparency>;
  
  ngOnInit() {
    this.transparency$ = this.paymentService.getFinancialTransparency();
  }
}

// transparency.component.html
<div class="transparency-dashboard">
  <h2>Financial Transparency</h2>
  <p class="tagline">Sadaqah Jariyah - Ongoing Charity through Islamic App Discovery</p>
  
  <div *ngIf="transparency$ | async as data">
    <h3>{{ data.month }}</h3>
    
    <div class="revenue-breakdown">
      <div class="metric">
        <span class="label">Total Revenue</span>
        <span class="value">${{ data.totalRevenue }}</span>
      </div>
      <div class="metric">
        <span class="label">Donations</span>
        <span class="value">${{ data.donationRevenue }}</span>
      </div>
      <div class="metric">
        <span class="label">Subscriptions</span>
        <span class="value">${{ data.subscriptionRevenue }}</span>
      </div>
    </div>
    
    <div class="expenses">
      <h4>Expenses</h4>
      <p>Infrastructure: ${{ data.infrastructureCosts }}</p>
    </div>
    
    <div class="surplus">
      <p>Net: ${{ data.surplusDeficit }}</p>
      <p class="message">{{ data.message }}</p>
    </div>
  </div>
</div>
```

### Required NuGet Packages
```xml
<PackageReference Include="Stripe.net" Version="43.0.0" />
```

## Priority
priority-2 (Phase 4 - Innovation)
