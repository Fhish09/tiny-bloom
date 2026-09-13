# Tiny Bloom Backend

Zero-dependency Node.js server. Saves products & orders as JSON.

## Run on your PC

```bash
cd tiny-bloom/backend
node server.js
```

Open: **http://localhost:3000/index.html**

No `npm install` needed.

## API

| Method | Path | What it does |
|--------|------|----------------|
| GET | `/api/health` | Server alive |
| GET | `/api/products` | All dolls |
| GET | `/api/products/:id` | One doll |
| POST | `/api/orders` | Place order |
| GET | `/api/orders/:code` | Find order |
| GET | `/api/admin/orders?key=tinybloom-admin` | List all orders |

### Example order body

```json
{
  "productId": "baby-rose",
  "quantity": 1,
  "customer": {
    "fullName": "Jane Doe",
    "email": "jane@email.com",
    "phone": "+234 800 000 0000",
    "address": "12 Rose Street",
    "city": "Lagos",
    "postal": "100001",
    "country": "Nigeria",
    "notes": ""
  }
}
```

## Files

- `data/products.json` — catalog + stock
- `data/orders.json` — every order placed

## Admin

Default key: `tinybloom-admin`  
Change with: `ADMIN_KEY=secret node server.js`
