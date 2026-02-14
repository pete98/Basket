# API Endpoints - Basket Grocery App

This document captures the Store and Store Inventory endpoints with request/response payloads.

---

## Store Endpoints (`/api/stores`)

### 1. Create Store
`POST /api/stores`

Request Body:
```json
{
  "code": "JC_001",
  "displayName": "Jersey City Downtown",
  "phone": "201-555-0199",
  "street": "123 Grove St",
  "street2": "Suite 10",
  "city": "Jersey City",
  "state": "NJ",
  "zip": "07302",
  "lat": 40.7181,
  "lng": -74.0480,
  "timezone": "America/New_York",
  "status": "ACTIVE",
  "pickupEnabled": true
}
```

Response: `201 Created`
```json
{
  "id": 1,
  "code": "JC_001",
  "displayName": "Jersey City Downtown",
  "phone": "201-555-0199",
  "street": "123 Grove St",
  "street2": "Suite 10",
  "city": "Jersey City",
  "state": "NJ",
  "zip": "07302",
  "lat": 40.7181,
  "lng": -74.0480,
  "timezone": "America/New_York",
  "status": "ACTIVE",
  "pickupEnabled": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 2. Get All Stores
`GET /api/stores`

Optional Query: `?status=ACTIVE|TEMP_OFFLINE|CLOSED_PERMANENT`

Response: `200 OK`
```json
[
  {
    "id": 1,
    "code": "JC_001",
    "displayName": "Jersey City Downtown",
    "phone": "201-555-0199",
    "street": "123 Grove St",
    "street2": "Suite 10",
    "city": "Jersey City",
    "state": "NJ",
    "zip": "07302",
    "lat": 40.7181,
    "lng": -74.0480,
    "timezone": "America/New_York",
    "status": "ACTIVE",
    "pickupEnabled": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

### 3. Get Store by ID
`GET /api/stores/{id}`

Response: `200 OK`
```json
{
  "id": 1,
  "code": "JC_001",
  "displayName": "Jersey City Downtown",
  "phone": "201-555-0199",
  "street": "123 Grove St",
  "street2": "Suite 10",
  "city": "Jersey City",
  "state": "NJ",
  "zip": "07302",
  "lat": 40.7181,
  "lng": -74.0480,
  "timezone": "America/New_York",
  "status": "ACTIVE",
  "pickupEnabled": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 4. Update Store
`PUT /api/stores/{id}`

Request Body:
```json
{
  "code": "JC_001",
  "displayName": "Jersey City Downtown - Updated",
  "phone": "201-555-0199",
  "street": "123 Grove St",
  "street2": "Suite 10",
  "city": "Jersey City",
  "state": "NJ",
  "zip": "07302",
  "lat": 40.7181,
  "lng": -74.0480,
  "timezone": "America/New_York",
  "status": "ACTIVE",
  "pickupEnabled": false
}
```

Response: `200 OK`
```json
{
  "id": 1,
  "code": "JC_001",
  "displayName": "Jersey City Downtown - Updated",
  "phone": "201-555-0199",
  "street": "123 Grove St",
  "street2": "Suite 10",
  "city": "Jersey City",
  "state": "NJ",
  "zip": "07302",
  "lat": 40.7181,
  "lng": -74.0480,
  "timezone": "America/New_York",
  "status": "ACTIVE",
  "pickupEnabled": false,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

### 5. Delete Store (Soft Delete)
`DELETE /api/stores/{id}`

Response: `204 No Content` (no body)

Effect: `status` becomes `CLOSED_PERMANENT`.

### 6. Enable Pickup
`PUT /api/stores/{id}/enable-pickup`

Response: `200 OK` (store payload)

### 7. Disable Pickup
`PUT /api/stores/{id}/disable-pickup`

Response: `200 OK` (store payload)

### 8. Find Stores Nearby
`GET /api/stores/nearby?lat=40.7128&lng=-74.0060&radiusMiles=10`

Response: `200 OK`
```json
[
  {
    "id": 1,
    "code": "JC_001",
    "displayName": "Jersey City Downtown",
    "phone": "201-555-0199",
    "street": "123 Grove St",
    "street2": "Suite 10",
    "city": "Jersey City",
    "state": "NJ",
    "zip": "07302",
    "lat": 40.7181,
    "lng": -74.0480,
    "timezone": "America/New_York",
    "status": "ACTIVE",
    "pickupEnabled": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

---

## Store Inventory Endpoints (`/api/stores/{storeId}/inventory`)

### 1. Create Store Inventory Item
`POST /api/stores/{storeId}/inventory`

Request Body (same as `InventoryRequestDTO`, no `storeId` needed):
```json
{
  "itemName": "Store Chips",
  "productCode": "STORE-PROD-001",
  "sku": "SKU-STORE-001",
  "price": 2.5,
  "stockQuantity": 25,
  "taxEnabled": true
}
```

Response: `201 Created`
```json
{
  "id": 10,
  "itemName": "Store Chips",
  "productCode": "STORE-PROD-001",
  "sku": "SKU-STORE-001",
  "price": 2.5,
  "stockQuantity": 25,
  "categories": null,
  "subCategory": null,
  "brand": null,
  "modifiers": null,
  "labels": null,
  "taxRate": null,
  "taxEnabled": true,
  "fees": null,
  "description": null,
  "imageUrl": null,
  "calories": null,
  "weight": null,
  "weightUnit": null,
  "popularityScore": null
}
```

### 2. Get Store Inventory Items
`GET /api/stores/{storeId}/inventory`

Response: `200 OK`
```json
[
  {
    "id": 10,
    "itemName": "Store Chips",
    "productCode": "STORE-PROD-001",
    "sku": "SKU-STORE-001",
    "price": 2.5,
    "stockQuantity": 25,
    "categories": null,
    "subCategory": null,
    "brand": null,
    "modifiers": null,
    "labels": null,
    "taxRate": null,
    "taxEnabled": true,
    "fees": null,
    "description": null,
    "imageUrl": null,
    "calories": null,
    "weight": null,
    "weightUnit": null,
    "popularityScore": null
  }
]
```

---

## Optional `storeId` on Global Inventory
`POST /api/inventory`

Request Body:
```json
{
  "storeId": 1,
  "itemName": "Store Cola",
  "productCode": "STORE-PROD-002",
  "sku": "SKU-STORE-002",
  "price": 1.99,
  "stockQuantity": 50,
  "taxEnabled": true
}
```
