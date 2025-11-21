# API Integration Skeleton - Basket Grocery App

This document maps out the skeleton structure for **Categories**, **Products**, and **Search** functionality to help plan backend API integration.

---

## 📋 Table of Contents
1. [Data Models & Interfaces](#data-models--interfaces)
2. [Categories](#categories)
3. [Products](#products)
4. [Search](#search)
5. [API Endpoint Structure](#api-endpoint-structure)
6. [State Management](#state-management)
7. [Component Architecture](#component-architecture)
8. [Data Flow](#data-flow)

---

## 📊 Data Models & Interfaces

### Category Interface
```typescript
interface Category {
  id: string;              // Unique category identifier
  name: string;            // Display name (e.g., "Soda", "Snacks")
  icon: string;            // Emoji or icon identifier (e.g., "🥤")
  slug?: string;           // URL-friendly identifier (optional)
  imageUrl?: string;       // Category image URL (optional)
  description?: string;    // Category description (optional)
  productCount?: number;   // Number of products in category (optional)
  isActive?: boolean;      // Whether category is active/visible (optional)
}
```

### Product Interface
```typescript
interface Product {
  id: string;                    // Unique product identifier
  name: string;                  // Product name
  price: number;                 // Current price
  originalPrice?: number;        // Original price (for discounts)
  image: string;                 // Product image URL
  category: string;              // Category name or ID
  categoryId?: string;           // Category ID reference (optional)
  inStock: boolean;              // Stock availability
  discount?: number;             // Discount percentage (optional)
  description?: string;          // Product description (optional)
  unit?: string;                 // Unit of measurement (e.g., "lb", "oz", "pack") (optional)
  sku?: string;                  // Stock keeping unit (optional)
  rating?: number;               // Average rating (optional)
  reviewCount?: number;          // Number of reviews (optional)
  tags?: string[];               // Product tags for search (optional)
}
```

### Search Result Interface
```typescript
interface SearchResult {
  products: Product[];           // Matching products
  categories?: Category[];       // Matching categories (optional)
  suggestions?: string[];        // Search suggestions (optional)
  totalCount: number;            // Total matching results
  hasMore: boolean;              // Whether more results available
}
```

---

## 🏷️ Categories

### Current Implementation
- **Location**: `app/(tabs)/index.tsx` (lines 35-46, 180-207, 305-316, 353-415)
- **Display**: Horizontal scrollable list with expand/collapse grid view
- **State**: `selectedCategory` (string | null) - tracks selected category
- **Interaction**: Click to filter products by category

### Component Structure
```
HomeScreen
├── CategorySection (Fixed at top)
│   ├── SearchPill (Search input)
│   ├── ExpandToggleButton (Grid/List toggle)
│   └── CategoriesList/Grid
│       └── CategoryCard[] (Individual category items)
│           ├── CategoryIcon
│           └── CategoryName
```

### Key Features
1. **Horizontal Scroll**: Categories displayed in horizontal scrollable list
2. **Grid View**: Expandable grid view showing all categories
3. **Selection State**: Visual feedback for selected category
4. **Category Filtering**: Filters products when category is selected
5. **AI Integration**: Supports agent-based category selection via `agentBus`

### State Management
- `selectedCategory`: Currently selected category name
- `isCategoriesExpanded`: Whether grid view is expanded
- `categorySectionHeight`: Dynamic height for scroll offset calculation

### API Integration Points

#### 1. Fetch All Categories
**Endpoint**: `GET /api/categories`
**Response**:
```json
{
  "categories": [
    {
      "id": "1",
      "name": "Soda",
      "icon": "🥤",
      "slug": "soda",
      "imageUrl": "https://...",
      "productCount": 15,
      "isActive": true
    }
  ],
  "total": 10
}
```

#### 2. Fetch Category by ID
**Endpoint**: `GET /api/categories/:id`
**Response**:
```json
{
  "id": "1",
  "name": "Soda",
  "icon": "🥤",
  "slug": "soda",
  "imageUrl": "https://...",
  "description": "Carbonated beverages",
  "productCount": 15,
  "isActive": true
}
```

#### 3. Fetch Products by Category
**Endpoint**: `GET /api/categories/:id/products` or `GET /api/products?categoryId=:id`
**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `sort`: Sort order (e.g., "price_asc", "price_desc", "name_asc")
- `inStock`: Filter by stock status (true/false)

**Response**:
```json
{
  "products": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1,
    "hasMore": false
  }
}
```

---

## 🛍️ Products

### Current Implementation
- **Location**: `app/(tabs)/index.tsx` (lines 48-99, 209-241, 243-268, 424-452)
- **Display**: Horizontal scrollable sections with product cards
- **Sections**: Flash Sale, Soda & Drinks, Candy & Sweets, Snacks, Fresh Vegetables
- **Filtering**: Products filtered by selected category

### Component Structure
```
HomeScreen
└── ScrollView
    ├── BannerCarousel (Promotional banners)
    └── ProductSection[] (Multiple sections)
        ├── SectionHeader
        │   ├── SectionTitle
        │   └── SeeAllButton
        └── ProductList (Horizontal FlatList)
            └── ProductCard[]
                ├── DiscountBadge (if discount exists)
                ├── ProductImage
                ├── ProductName
                ├── ProductPriceContainer
                │   ├── CurrentPrice
                │   └── OriginalPrice (if discount)
                └── AddToCartButton
```

### Key Features
1. **Multiple Sections**: Different product sections (Sale, Category-based)
2. **Horizontal Scrolling**: Each section scrolls horizontally
3. **Discount Display**: Shows discount badges and original prices
4. **Stock Status**: Indicates product availability
5. **Category Filtering**: Shows filtered products when category selected
6. **Add to Cart**: Button to add products to cart (currently logs to console)

### State Management
- `productsData`: Array of all products (currently mock data)
- `filteredProducts`: Products filtered by selected category
- `saleProducts`, `sodaProducts`, etc.: Pre-filtered product arrays

### Product Sections
1. **Flash Sale** 🔥 - Products with discounts
2. **Soda & Drinks** 🥤 - Beverage products
3. **Candy & Sweets** 🍭 - Confectionery products
4. **Snacks** 🍪 - Snack products
5. **Fresh Vegetables** 🥬 - Vegetable products

### API Integration Points

#### 1. Fetch All Products
**Endpoint**: `GET /api/products`
**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `categoryId`: Filter by category ID
- `category`: Filter by category name
- `inStock`: Filter by stock status (true/false)
- `onSale`: Filter sale products (true/false)
- `sort`: Sort order (e.g., "price_asc", "price_desc", "name_asc", "popularity")
- `minPrice`: Minimum price filter
- `maxPrice`: Maximum price filter
- `search`: Search query (optional)

**Response**:
```json
{
  "products": [
    {
      "id": "s1",
      "name": "Premium Chips",
      "price": 2.99,
      "originalPrice": 4.99,
      "image": "https://...",
      "category": "Sale",
      "categoryId": "2",
      "inStock": true,
      "discount": 40,
      "description": "...",
      "unit": "pack",
      "sku": "CHP-001",
      "rating": 4.5,
      "reviewCount": 120
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3,
    "hasMore": true
  }
}
```

#### 2. Fetch Product by ID
**Endpoint**: `GET /api/products/:id`
**Response**:
```json
{
  "id": "s1",
  "name": "Premium Chips",
  "price": 2.99,
  "originalPrice": 4.99,
  "image": "https://...",
  "category": "Sale",
  "categoryId": "2",
  "inStock": true,
  "discount": 40,
  "description": "Premium quality potato chips",
  "unit": "pack",
  "sku": "CHP-001",
  "rating": 4.5,
  "reviewCount": 120,
  "tags": ["snacks", "chips", "sale"]
}
```

#### 3. Fetch Products by Section/Type
**Endpoint**: `GET /api/products/sections/:sectionType`
**Section Types**: `flash-sale`, `featured`, `trending`, `new-arrivals`
**Query Parameters**: Same as Fetch All Products

#### 4. Fetch Featured Products
**Endpoint**: `GET /api/products/featured`
**Query Parameters**: `limit` (default: 10)

---

## 🔍 Search

### Current Implementation
- **Location**: 
  - Search input: `app/(tabs)/index.tsx` (lines 354-369)
  - Search screen: `app/(tabs)/search.tsx`
- **Display**: Search pill in home screen + dedicated search screen
- **State**: `searchQuery` (string) - current search input
- **Functionality**: Currently displays "No results" placeholder

### Component Structure
```
HomeScreen
└── SearchPill
    ├── SearchIcon
    └── SearchInput

SearchScreen
├── SearchInput (GlassView)
└── SearchResults
    ├── ProductResults
    ├── CategoryResults (optional)
    └── Suggestions (optional)
```

### Key Features
1. **Search Input**: Available in home screen header
2. **Dedicated Screen**: Full search screen with glass effect
3. **Real-time Search**: Should support debounced search as user types
4. **Search Results**: Products matching search query
5. **Suggestions**: Search suggestions/autocomplete (optional)
6. **Category Results**: Show matching categories (optional)

### State Management
- `searchQuery`: Current search input value
- `searchResults`: Array of matching products
- `isSearching`: Loading state for search
- `searchSuggestions`: Autocomplete suggestions (optional)

### API Integration Points

#### 1. Search Products
**Endpoint**: `GET /api/search` or `GET /api/products/search`
**Query Parameters**:
- `q`: Search query (required)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `categoryId`: Filter by category (optional)
- `sort`: Sort order (optional)
- `inStock`: Filter by stock status (optional)

**Response**:
```json
{
  "products": [...],
  "categories": [
    {
      "id": "1",
      "name": "Soda",
      "matchType": "name"
    }
  ],
  "suggestions": ["soda", "soft drinks", "carbonated"],
  "totalCount": 25,
  "hasMore": true,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

#### 2. Search Autocomplete/Suggestions
**Endpoint**: `GET /api/search/suggestions` or `GET /api/search/autocomplete`
**Query Parameters**:
- `q`: Partial search query (required)
- `limit`: Number of suggestions (default: 5)

**Response**:
```json
{
  "suggestions": [
    {
      "text": "soda",
      "type": "category",
      "categoryId": "1"
    },
    {
      "text": "soft drinks",
      "type": "query"
    },
    {
      "text": "cola classic",
      "type": "product",
      "productId": "d1"
    }
  ]
}
```

#### 3. Popular Searches
**Endpoint**: `GET /api/search/popular`
**Response**:
```json
{
  "searches": [
    "soda",
    "chips",
    "candy",
    "vegetables"
  ]
}
```

#### 4. Recent Searches (Client-side or Backend)
**Endpoint**: `GET /api/search/recent` (if stored on backend)
**Response**:
```json
{
  "searches": [
    {
      "query": "soda",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 🔌 API Endpoint Structure

### Base URL
```
https://api.yourdomain.com/v1
```

### Categories Endpoints
```
GET    /api/categories              # Get all categories
GET    /api/categories/:id          # Get category by ID
GET    /api/categories/:id/products # Get products in category
```

### Products Endpoints
```
GET    /api/products                # Get all products (with filters)
GET    /api/products/:id            # Get product by ID
GET    /api/products/sections/:type # Get products by section
GET    /api/products/featured       # Get featured products
```

### Search Endpoints
```
GET    /api/search                  # Search products and categories
GET    /api/search/suggestions      # Get search suggestions
GET    /api/search/popular          # Get popular searches
GET    /api/search/recent           # Get recent searches (optional)
```

### Common Query Parameters
- `page`: Page number (integer, default: 1)
- `limit`: Items per page (integer, default: 20, max: 100)
- `sort`: Sort order (string, e.g., "price_asc", "price_desc", "name_asc")
- `inStock`: Filter by stock (boolean)

### Response Format
All endpoints should return consistent response format:
```json
{
  "success": true,
  "data": {...},
  "pagination": {...},  // If applicable
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0"
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {...}  // Optional additional details
  }
}
```

---

## 🗂️ State Management

### Current State (Local Component State)
- Categories: `useState` in `HomeScreen`
- Products: `useState` in `HomeScreen`
- Search: `useState` in `HomeScreen` and `SearchScreen`

### Recommended State Management Approach

#### Option 1: React Query (Recommended)
```typescript
// Using @tanstack/react-query for server state
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

// Categories
const { data: categories } = useQuery({
  queryKey: ['categories'],
  queryFn: fetchCategories
});

// Products
const { data: products } = useQuery({
  queryKey: ['products', { categoryId, page, limit }],
  queryFn: () => fetchProducts({ categoryId, page, limit })
});

// Search
const { data: searchResults } = useQuery({
  queryKey: ['search', query],
  queryFn: () => searchProducts(query),
  enabled: query.length > 0
});
```

#### Option 2: Context + Reducer
```typescript
// Global state for categories, products, search
interface AppState {
  categories: Category[];
  products: Product[];
  selectedCategory: string | null;
  searchQuery: string;
  searchResults: Product[];
}
```

#### Option 3: Zustand Store
```typescript
interface Store {
  categories: Category[];
  products: Product[];
  selectedCategory: string | null;
  searchQuery: string;
  fetchCategories: () => Promise<void>;
  fetchProducts: (filters?: ProductFilters) => Promise<void>;
  searchProducts: (query: string) => Promise<void>;
}
```

---

## 🏗️ Component Architecture

### File Structure Recommendation
```
lib/
├── api/
│   ├── client.ts              # API client configuration
│   ├── categories.ts          # Category API functions
│   ├── products.ts            # Product API functions
│   └── search.ts              # Search API functions
├── hooks/
│   ├── use-categories.ts      # Categories hook
│   ├── use-products.ts        # Products hook
│   └── use-search.ts          # Search hook
└── types/
    ├── category.ts            # Category types
    ├── product.ts             # Product types
    └── search.ts              # Search types

components/
├── categories/
│   ├── category-card.tsx
│   ├── category-list.tsx
│   └── category-grid.tsx
├── products/
│   ├── product-card.tsx
│   ├── product-list.tsx
│   └── product-section.tsx
└── search/
    ├── search-input.tsx
    ├── search-results.tsx
    └── search-suggestions.tsx
```

---

## 🔄 Data Flow

### Categories Flow
```
1. App Loads
   ↓
2. Fetch Categories (GET /api/categories)
   ↓
3. Display Categories in UI
   ↓
4. User Selects Category
   ↓
5. Update selectedCategory State
   ↓
6. Fetch Products for Category (GET /api/products?categoryId=:id)
   ↓
7. Display Filtered Products
```

### Products Flow
```
1. App Loads / Category Selected
   ↓
2. Fetch Products (GET /api/products or GET /api/products?categoryId=:id)
   ↓
3. Group Products by Section/Type
   ↓
4. Display Product Sections
   ↓
5. User Scrolls / Loads More
   ↓
6. Fetch Next Page (GET /api/products?page=2)
   ↓
7. Append to Existing Products
```

### Search Flow
```
1. User Types in Search Input
   ↓
2. Debounce Input (300-500ms)
   ↓
3. Fetch Suggestions (GET /api/search/suggestions?q=:query) [Optional]
   ↓
4. User Submits Search / Selects Suggestion
   ↓
5. Fetch Search Results (GET /api/search?q=:query)
   ↓
6. Display Search Results
   ↓
7. User Filters/Sorts Results
   ↓
8. Refetch with Filters (GET /api/search?q=:query&sort=:sort)
```

---

## 📝 Integration Checklist

### Categories
- [ ] Create API client for categories endpoint
- [ ] Replace mock categories data with API call
- [ ] Handle loading states
- [ ] Handle error states
- [ ] Implement category selection persistence
- [ ] Add category image support (if provided by API)

### Products
- [ ] Create API client for products endpoint
- [ ] Replace mock products data with API call
- [ ] Implement pagination for product lists
- [ ] Handle loading states
- [ ] Handle error states
- [ ] Implement infinite scroll or "Load More" button
- [ ] Add product detail navigation (if needed)
- [ ] Implement add to cart functionality with API

### Search
- [ ] Create API client for search endpoint
- [ ] Implement debounced search input
- [ ] Display search results
- [ ] Handle empty search results
- [ ] Implement search suggestions/autocomplete (optional)
- [ ] Add search history (optional)
- [ ] Implement search filters (category, price, etc.)

### General
- [ ] Set up API base URL configuration
- [ ] Implement authentication headers (if required)
- [ ] Add error handling and retry logic
- [ ] Implement caching strategy
- [ ] Add loading skeletons/placeholders
- [ ] Test API integration on both iOS and Android
- [ ] Handle network errors gracefully
- [ ] Implement offline support (optional)

---

## 🎯 Priority Implementation Order

1. **Categories API** - Foundation for filtering
2. **Products API** - Core functionality
3. **Search API** - Enhanced user experience
4. **Pagination** - Performance optimization
5. **Error Handling** - Robustness
6. **Loading States** - User experience
7. **Caching** - Performance optimization
8. **Search Suggestions** - Enhanced UX (optional)

---

## 📚 Additional Notes

### Image Handling
- Products and categories use image URLs
- Consider implementing image caching with `expo-image`
- Handle image loading errors gracefully
- Support different image sizes for optimization

### Performance Considerations
- Implement pagination to avoid loading all products at once
- Use React Query or similar for automatic caching and refetching
- Debounce search inputs to reduce API calls
- Implement virtualized lists for large product lists
- Consider lazy loading for product images

### Error Handling
- Network errors (no internet, timeout)
- API errors (4xx, 5xx status codes)
- Empty results
- Invalid data format

### Testing
- Test with empty API responses
- Test with slow network connections
- Test error scenarios
- Test pagination edge cases
- Test search with special characters

---

**Last Updated**: 2024-01-15
**Version**: 1.0








