# EzyBills - Laravel POS Backend API

A comprehensive, modular Laravel backend for the **EzyBills** multi-business POS billing software. This API supports retail shops, restaurants, medical stores, and more with complete inventory management, invoicing, customer management, and SaaS features.

---

## 🎯 Project Structure

### Core Modules

1. **Authentication & Authorization**
   - User registration, login, OTP-based login
   - Role-based access control (Owner, Manager, Cashier, Accountant, Super Admin)
   - JWT/Sanctum token authentication
   - Password reset functionality

2. **Business Setup**
   - Business profile management
   - GST and tax configuration
   - Invoice settings and printing preferences
   - Bank and UPI details

3. **POS Billing**
   - Fast invoice generation with barcode scanning
   - Support for GST, retail, estimate, and return invoices
   - Multiple payment methods (Cash, UPI, Card, Credit, Mixed)
   - Hold/Resume billing functionality
   - Customer quick-add

4. **Product Management**
   - Complete product catalog with categories and brands
   - Multi-unit support with conversions (PCS, KG, Liter, etc.)
   - Product variants (Size, Color, Weight, etc.)
   - Barcode generation and tracking
   - HSN code and GST configuration

5. **Inventory & Stock**
   - Real-time stock tracking
   - Stock in/out, adjustments, and movements
   - Low stock and out-of-stock alerts
   - Stock ledger and valuation reports

6. **Customer Management**
   - Customer CRUD with groups and classifications
   - Credit system with due tracking
   - Payment history and partial payments
   - Customer ledger and purchase history
   - Due reminders (WhatsApp, SMS, Email)

7. **Supplier & Purchase**
   - Supplier management and payment tracking
   - Purchase entry and returns
   - Supplier ledger and due reports

8. **Expenses**
   - Expense categories and tracking
   - Daily, monthly, and category-wise reports
   - Multiple payment methods

9. **Reports**
   - Sales, purchase, stock, profit/loss reports
   - Customer due and overdue reports
   - GST and tax compliance reports
   - Excel and PDF exports

10. **Restaurant Features** (Optional)
    - Table management with status tracking
    - KOT (Kitchen Order Ticket) system
    - Token-based order system
    - Dine-in, Takeaway, Delivery support

11. **WhatsApp Integration**
    - Invoice sharing via WhatsApp
    - Due reminders and payment notifications
    - Template management
    - Message delivery tracking

12. **Subscription & License**
    - Multi-tier plans (Trial, Monthly, Quarterly, Yearly, Lifetime)
    - Device activation and licensing
    - Feature toggles per plan
    - Auto-renewal management

13. **Master Admin Panel** (SaaS)
    - Customer business management
    - Subscription and renewal tracking
    - Device and license management
    - Revenue analytics and reports
    - Support ticket system

---

## 📋 Technology Stack

- **Framework**: Laravel 11.x
- **Database**: MySQL/PostgreSQL
- **Authentication**: Laravel Sanctum
- **API**: RESTful JSON API
- **Queue**: Redis/Database
- **Cache**: Redis/File
- **Storage**: Local/S3

---

## 🚀 Quick Start

### Prerequisites

- PHP 8.1+
- Composer
- MySQL 8.0+ or PostgreSQL 12+
- Node.js (optional, for frontend)

### Installation

1. **Clone the repository**
   ```bash
   cd d:\Ezybills
   ```

2. **Install dependencies**
   ```bash
   composer install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Generate app key**
   ```bash
   php artisan key:generate
   ```

5. **Configure database** in `.env`
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=ezybills
   DB_USERNAME=root
   DB_PASSWORD=
   ```

6. **Run migrations**
   ```bash
   php artisan migrate
   ```

7. **Seed database** (optional)
   ```bash
   php artisan db:seed
   ```

8. **Start development server**
   ```bash
   php artisan serve
   ```

   API will be available at: `http://localhost:8000/api/v1`

---

## 📚 API Documentation

### Base URL
```
http://localhost:8000/api/v1
```

### Authentication

**Register**
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "password123",
  "password_confirmation": "password123",
  "business_name": "My Shop",
  "business_type": "retail"
}
```

**Login**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Login with OTP**
```http
POST /auth/login-otp
Content-Type: application/json

{
  "phone": "9876543210"
}
```

### Protected Endpoints

All protected endpoints require the `Authorization: Bearer {token}` header.

**Example: Create Product**
```http
POST /products
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Product Name",
  "product_code": "P001",
  "sku": "SKU001",
  "barcode": "1234567890",
  "category_id": 1,
  "brand_id": 1,
  "gst_percentage": 18,
  "purchase_price": 100,
  "sale_price": 150,
  "primary_unit_id": 1
}
```

**Create Invoice**
```http
POST /invoices
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_id": 1,
  "invoice_type": "retail_invoice",
  "discount_amount": 0,
  "round_off": 0,
  "items": [
    {
      "product_id": 1,
      "quantity": 5,
      "unit_price": 150,
      "discount_percentage": 0
    }
  ]
}
```

---

## 📁 Directory Structure

```
d:/Ezybills/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/                    # API Controllers
│   │   │   │   ├── AuthController.php
│   │   │   │   ├── ProductController.php
│   │   │   │   ├── InvoiceController.php
│   │   │   │   └── ...
│   │   │   └── Admin/                  # Admin Controllers
│   │   ├── Middleware/                 # Custom middleware
│   │   └── Requests/                   # Form requests
│   ├── Models/                         # Eloquent models
│   ├── Services/                       # Business logic
│   ├── Jobs/                           # Queued jobs
│   ├── Notifications/                  # Notifications
│   ├── Policies/                       # Authorization policies
│   └── Exceptions/                     # Custom exceptions
├── database/
│   ├── migrations/                     # Database migrations
│   ├── seeders/                        # Database seeders
│   └── factories/                      # Model factories
├── routes/
│   └── api.php                         # API routes
├── config/                             # Configuration files
├── public/
│   └── index.php                       # Entry point
├── storage/                            # File storage
├── bootstrap/
│   └── app.php                         # Bootstrap
├── tests/                              # Tests
├── composer.json                       # Dependencies
└── .env.example                        # Environment template
```

---

## 🔑 Key Features

✅ **Fast Billing** - Optimized for high-speed transaction processing
✅ **Barcode Integration** - Support for barcode scanning devices
✅ **Inventory Management** - Real-time stock tracking and alerts
✅ **Multi-user Support** - Role-based permissions and employee tracking
✅ **GST Compliance** - Full GST invoice generation and reporting
✅ **WhatsApp Integration** - Auto-send invoices and reminders
✅ **Thermal Printer** - Support for thermal and USB printers
✅ **Restaurant Features** - Table management, KOT, and token system
✅ **SaaS Ready** - Multi-tenant, subscription, and device licensing
✅ **Mobile Sync** - Offline-first with sync capabilities

---

## 🛠 Configuration

### Enable Restaurant Features
```env
# In BusinessSettings
enable_restaurant_features=true
```

### Enable WhatsApp
```env
WHATSAPP_API_KEY=your_api_key
WHATSAPP_BUSINESS_ACCOUNT_ID=your_account_id
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
```

### Configure Printer
```env
# In BusinessSettings
thermal_printer_model=Epson_TM_T20
receipt_width=80mm
printer_ip=192.168.1.100
```

---

## 📦 Database Models

- `User` - User accounts and authentication
- `Business` - Business profiles
- `Product` - Product catalog
- `Invoice`, `InvoiceItem` - Billing
- `Customer`, `Supplier` - Business contacts
- `Stock`, `StockMovement` - Inventory
- `Expense` - Expense tracking
- `Plan`, `Subscription` - SaaS management
- `Device` - Device licensing
- `Table`, `KOT`, `Token` - Restaurant features

---

## 🧪 Testing

```bash
# Run all tests
php artisan test

# Run specific test
php artisan test tests/Feature/BillingTest.php

# Run with coverage
php artisan test --coverage
```

---

## 🚢 Deployment

### Production Setup

1. **Set environment to production**
   ```bash
   APP_ENV=production
   APP_DEBUG=false
   ```

2. **Optimize for production**
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   php artisan optimize
   ```

3. **Set up queue worker**
   ```bash
   php artisan queue:work
   ```

4. **Configure logging**
   ```bash
   LOG_CHANNEL=stack
   LOG_LEVEL=info
   ```

---

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved",
  "data": [],
  "pagination": {
    "total": 100,
    "per_page": 20,
    "current_page": 1,
    "last_page": 5,
    "from": 1,
    "to": 20
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": {}
}
```

---

## 🔒 Security

- JWT/Sanctum token authentication
- Role-based access control (RBAC)
- Activity logging and audit trails
- SQL injection protection
- CSRF protection
- Rate limiting on API endpoints
- Encrypted sensitive data

---

## 📞 Support

For issues and feature requests, please open an issue on GitHub or contact the development team.

---

## 📄 License

Proprietary - EzyBills © 2026

---

## 🎯 Next Steps

1. **Set up frontend applications**:
   - Web Dashboard (React/Next.js)
   - Mobile App (Flutter)
   - Admin Panel (React/Next.js)

2. **Implement advanced features**:
   - WhatsApp API integration
   - Payment gateway integration (Razorpay)
   - SMS gateway integration
   - Email notifications

3. **Configure deployment**:
   - AWS/DigitalOcean setup
   - Docker containerization
   - CI/CD pipeline

4. **Monitoring & Analytics**:
   - Application performance monitoring
   - Error tracking (Sentry)
   - Analytics dashboard

---

**Made with ❤️ for EzyBills**
