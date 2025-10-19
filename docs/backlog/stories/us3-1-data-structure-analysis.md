# US3.1: Data Structure Analysis

**Epic:** Epic 3 - Data Migration Engine  
**Sprint:** Week 2, Day 1  
**Story Points:** 3  
**Priority:** P1 (Critical)  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Developer  
**I want to** analyze and document the structure of the existing static data in `applicationsData.ts`  
**So that** I can create an accurate migration plan and identify all data transformation requirements

---

## 🎯 Acceptance Criteria

### AC1: Static Data File Analysis Complete
- [ ] `applicationsData.ts` file analyzed (44 apps, 11 categories)
- [ ] Data structure documented with all fields:
  - `id`, `Name_Ar`, `Name_En`
  - `Short_Description_Ar`, `Short_Description_En`
  - `Description_Ar`, `Description_En`
  - `Developer_Name_Ar`, `Developer_Name_En`, `Developer_Website`, `Developer_Logo`
  - `categories` (array of strings)
  - `Apps_Avg_Rating`
  - `screenshots_ar`, `screenshots_en` (arrays)
  - `mainImage_ar`, `mainImage_en`
  - `applicationIcon`
  - `Google_Play_Link`, `AppStore_Link`, `App_Gallery_Link`
- [ ] Field types and constraints documented
- [ ] Sample data extracted for testing

### AC2: Data Quality Assessment
- [ ] Data completeness analysis:
  - Required fields coverage: 100% for names, 95%+ for descriptions
  - Optional fields coverage documented
  - Missing data identified and logged
- [ ] Data consistency checks:
  - Duplicate app IDs identified (none expected)
  - Category name consistency verified
  - URL format validation
  - Image URL accessibility checked
- [ ] Data anomalies documented:
  - Invalid ratings (outside 0-5 range)
  - Broken image links
  - Missing translations

### AC3: Data Dictionary Created
- [ ] Complete data dictionary document created with:
  - Source field name
  - Target database column name
  - Data type (source → target)
  - Transformation rules
  - Validation rules
  - Default values for missing data
- [ ] Example mappings documented

### AC4: Entity Relationship Mapping
- [ ] Source-to-target entity mapping documented:
  - Single app object → `Apps` table + related tables
  - Categories array → `Categories` table + `AppCategories` junction
  - Developer fields → `Developers` table (extract unique developers)
  - Screenshots arrays → `Screenshots` table
- [ ] Foreign key relationships identified
- [ ] Many-to-many relationships mapped

### AC5: TypeScript Data Parsing Strategy
- [ ] TypeScript file parsing approach determined:
  - Option 1: Parse as JSON after minor modifications
  - Option 2: Use TypeScript compiler API
  - Option 3: Manual extraction via regex
- [ ] Recommended approach selected and justified
- [ ] Sample parsing code written in Python

### AC6: Migration Complexity Assessment
- [ ] Data transformation complexity rated (Low/Medium/High)
- [ ] Estimated transformation rules: ~15 rules
- [ ] Potential data loss risks identified
- [ ] Edge cases documented (e.g., apps without categories)

---

## 📝 Technical Notes

### Sample Data Structure (TypeScript)
```typescript
{
  id: 1,
  Name_Ar: "مصحف التجويد الملون",
  Name_En: "Tajweed Quran",
  Short_Description_Ar: "مصحف ملون بألوان التجويد",
  Short_Description_En: "Color-coded Tajweed Quran",
  Description_Ar: "تطبيق متميز...",
  Description_En: "Premium application...",
  Developer_Name_Ar: "شركة وَحي",
  Developer_Name_En: "Wahy Company",
  Developer_Website: "https://wahy.sa",
  Developer_Logo: "https://cdn.example.com/logos/wahy.png",
  categories: ["Reading", "Learning"],
  Apps_Avg_Rating: 4.7,
  screenshots_ar: ["https://cdn.example.com/screenshots/ar1.jpg"],
  screenshots_en: ["https://cdn.example.com/screenshots/en1.jpg"],
  mainImage_ar: "https://cdn.example.com/main/ar.jpg",
  mainImage_en: "https://cdn.example.com/main/en.jpg",
  applicationIcon: "https://cdn.example.com/icons/app1.png",
  Google_Play_Link: "https://play.google.com/store/apps/details?id=com.example",
  AppStore_Link: "https://apps.apple.com/app/id123456",
  App_Gallery_Link: null
}
```

### Data Dictionary Example
| Source Field | Target Column | Type Transform | Validation | Notes |
|--------------|---------------|----------------|------------|-------|
| id | N/A | number → Guid | Generate new Guid | Original ID not used |
| Name_Ar | NameAr | string → string | Required, MaxLength(200) | Direct mapping |
| Name_En | NameEn | string → string | Required, MaxLength(200) | Direct mapping |
| Developer_Name_Ar | → Developer.NameAr | string → string | Extract unique | Create Developer entity |
| categories | → AppCategories | string[] → List<Guid> | Map to Category IDs | Junction table |

### Python Parsing Approach
```python
# Option 1: Parse as JSON (recommended)
import json
import re
from typing import List, TypedDict

class StaticAppData(TypedDict):
    id: int
    Name_Ar: str
    Name_En: str
    # ... other properties

# Read and parse TypeScript file
with open('src/app/services/applicationsData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract JSON content from TypeScript export
json_str = re.sub(r'export const applications = ', '', content)
json_str = json_str.rstrip(';')

# Parse JSON
apps: List[StaticAppData] = json.loads(json_str)

# Process apps for database migration
for app in apps:
    print(f"Processing: {app['Name_En']}")
```

---

## 🔗 Dependencies
- Epic 1 & 2: Database schema and entities must be defined

---

## 🚫 Blockers
- Access to `src/app/services/applicationsData.ts` file required

---

## 📊 Definition of Done
- [ ] Complete data structure analysis documented
- [ ] Data quality assessment report created
- [ ] Data dictionary with all field mappings complete
- [ ] Entity relationship mapping documented
- [ ] Parsing strategy selected and tested
- [ ] Migration complexity assessment complete
- [ ] Sample parsing code working
- [ ] Team review and approval obtained

---

## 📚 Resources
- Current file: `src/app/services/applicationsData.ts`
- Python json module documentation
- Data migration best practices

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 3: Data Migration Engine](../epics/epic-3-data-migration-engine.md)
