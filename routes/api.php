<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api;

Route::get('/health', fn() => response()->json(['status' => 'ok']));

// Public routes
Route::prefix('v1')->group(function () {
    // Authentication
    Route::post('/auth/register', [Api\AuthController::class, 'register']);
    Route::post('/auth/login', [Api\AuthController::class, 'login']);
    Route::post('/auth/login-otp', [Api\AuthController::class, 'loginWithOtp']);
    Route::post('/auth/verify-otp', [Api\AuthController::class, 'verifyOtp']);
    Route::post('/auth/forgot-password', [Api\AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [Api\AuthController::class, 'resetPassword']);
    Route::get('/auth/verify-email/{token}', [Api\AuthController::class, 'verifyEmail']);
    Route::post('/auth/resend-verification', [Api\AuthController::class, 'resendVerification']);

    // Protected routes - require authentication
    Route::middleware(['auth:sanctum'])->group(function () {
        // Auth
        Route::post('/auth/logout', [Api\AuthController::class, 'logout']);
        Route::get('/auth/me', [Api\AuthController::class, 'me']);

        // Business Setup
        Route::apiResource('business', Api\BusinessController::class);
        Route::post('business/{business}/logo', [Api\BusinessController::class, 'uploadLogo']);
        Route::post('business/{business}/settings', [Api\BusinessSettingsController::class, 'update']);
        Route::get('business/{business}/settings', [Api\BusinessSettingsController::class, 'show']);

        // Dashboard
        Route::get('dashboard', [Api\DashboardController::class, 'index']);
        Route::get('dashboard/summary', [Api\DashboardController::class, 'summary']);
        Route::get('dashboard/charts', [Api\DashboardController::class, 'charts']);

        // Subscription status for logged-in user
        Route::get('my-plan', [Api\SubscriptionStatusController::class, 'myPlan']);

        // Products
        Route::apiResource('products', Api\ProductController::class);
        Route::post('products/{product}/upload-image', [Api\ProductController::class, 'uploadImage']);
        Route::post('products/barcode/generate', [Api\ProductController::class, 'generateBarcode']);
        Route::get('products/search', [Api\ProductController::class, 'search']);

        // Categories & Brands
        Route::apiResource('categories', Api\CategoryController::class);
        Route::apiResource('brands', Api\BrandController::class);
        Route::apiResource('units', Api\UnitController::class);

        // Inventory/Stock
        Route::post('stock/add', [Api\StockController::class, 'addStock']);
        Route::apiResource('stock', Api\StockController::class);
        Route::post('stock/{stock}/adjust', [Api\StockController::class, 'adjust']);
        Route::get('stock/reports/summary', [Api\StockReportController::class, 'summary']);
        Route::get('stock/reports/ledger', [Api\StockReportController::class, 'ledger']);
        Route::get('stock/alerts', [Api\StockAlertController::class, 'index']);

        // Customers
        Route::apiResource('customers', Api\CustomerController::class);
        Route::get('customers/{customer}/ledger', [Api\CustomerController::class, 'ledger']);
        Route::get('customers/{customer}/purchase-history', [Api\CustomerController::class, 'purchaseHistory']);
        Route::post('customers/{customer}/due-payment', [Api\CustomerPaymentController::class, 'recordPayment']);

        // Suppliers
        Route::apiResource('suppliers', Api\SupplierController::class);
        Route::get('suppliers/{supplier}/ledger', [Api\SupplierController::class, 'ledger']);

        // POS Billing
        Route::apiResource('invoices', Api\InvoiceController::class);
        Route::post('invoices/{invoice}/hold', [Api\InvoiceController::class, 'hold']);
        Route::post('invoices/{invoice}/resume', [Api\InvoiceController::class, 'resume']);
        Route::post('invoices/{invoice}/return', [Api\InvoiceController::class, 'createReturn']);
        Route::post('invoices/{invoice}/payment', [Api\InvoiceController::class, 'recordPayment']);
        Route::post('invoices/{invoice}/share-whatsapp', [Api\InvoiceController::class, 'shareViaWhatsApp']);
        Route::get('invoices/{invoice}/print', [Api\InvoiceController::class, 'print']);
        Route::get('invoices/{invoice}/pdf', [Api\InvoiceController::class, 'downloadPdf']);

        // Purchase
        Route::apiResource('purchases', Api\PurchaseController::class);
        Route::post('purchases/{purchase}/payment', [Api\PurchaseController::class, 'recordPayment']);

        // Expenses
        Route::apiResource('expenses', Api\ExpenseController::class);
        Route::apiResource('expense-categories', Api\ExpenseCategoryController::class);

        // Reports
        Route::get('reports/sales', [Api\SalesReportController::class, 'sales']);
        Route::get('reports/purchase', [Api\PurchaseReportController::class, 'purchase']);
        Route::get('reports/inventory', [Api\InventoryReportController::class, 'inventory']);
        Route::get('reports/customer-due', [Api\DueReportController::class, 'customerDue']);
        Route::get('reports/profit-loss', [Api\ProfitLossReportController::class, 'calculate']);
        Route::get('reports/gst', [Api\GstReportController::class, 'summary']);
        Route::get('reports/expense', [Api\ExpenseReportController::class, 'expense']);

        // Restaurant Features (if enabled)
        Route::middleware('business.type:restaurant,cafe,food_cart')->group(function () {
            Route::apiResource('tables', Api\TableController::class);
            Route::post('tables/{table}/merge', [Api\TableController::class, 'merge']);
            Route::post('tables/{table}/shift', [Api\TableController::class, 'shift']);

            Route::apiResource('kot', Api\KotController::class);
            Route::post('kot/{kot}/complete', [Api\KotController::class, 'complete']);
            Route::post('kot/{kot}/cancel', [Api\KotController::class, 'destroy']);

            Route::apiResource('tokens', Api\TokenController::class);
            Route::post('tokens/{token}/ready', [Api\TokenController::class, 'markReady']);
            Route::post('tokens/{token}/served', [Api\TokenController::class, 'update']);
        });

        // Employees
        Route::apiResource('employees', Api\EmployeeController::class);
        Route::post('employees/{employee}/attendance', [Api\AttendanceController::class, 'record']);

        // WhatsApp Integration
        Route::post('whatsapp/send-template', [Api\WhatsAppController::class, 'sendTemplate']);
        Route::get('whatsapp/templates', [Api\WhatsAppController::class, 'getTemplates']);
        Route::get('whatsapp/message-logs', [Api\WhatsAppController::class, 'messageLogs']);

        // Tax Rates
        Route::get('tax-rates', [Api\TaxRateController::class, 'index']);
        Route::post('tax-rates', [Api\TaxRateController::class, 'store']);
        Route::put('tax-rates/{taxRate}', [Api\TaxRateController::class, 'update']);
        Route::delete('tax-rates/{taxRate}', [Api\TaxRateController::class, 'destroy']);

        // Bulk imports
        Route::get('products/import/sample', [Api\BulkProductImportController::class, 'sampleCsv']);
        Route::post('products/import', [Api\BulkProductImportController::class, 'import']);
        Route::get('stock/restock/sample', [Api\BulkStockRestockController::class, 'sampleCsv']);
        Route::post('stock/restock', [Api\BulkStockRestockController::class, 'import']);

        // Settings
        Route::get('settings', [Api\SettingsController::class, 'show']);
        Route::post('settings', [Api\SettingsController::class, 'update']);
        Route::get('settings/printer', [Api\PrinterSettingsController::class, 'show']);
        Route::post('settings/printer', [Api\PrinterSettingsController::class, 'update']);
        Route::post('settings/backup', [Api\BackupController::class, 'backup']);

        // Master Admin Routes (Super Admin only)
        Route::middleware('admin.only')->group(function () {
            // Customer Management
            Route::apiResource('admin/businesses', Api\Admin\BusinessManagementController::class);
            Route::post('admin/businesses/{business}/suspend', [Api\Admin\BusinessManagementController::class, 'suspend']);
            Route::post('admin/businesses/{business}/activate', [Api\Admin\BusinessManagementController::class, 'activate']);
            Route::post('admin/businesses/{business}/login-as', [Api\Admin\BusinessManagementController::class, 'loginAsCustomer']);
            Route::post('admin/businesses/{business}/toggle-restaurant', [Api\Admin\BusinessManagementController::class, 'toggleRestaurantFeatures']);

            // Subscription Management
            Route::apiResource('admin/plans', Api\Admin\PlanController::class);
            Route::post('admin/subscriptions/{subscription}/extend', [Api\Admin\SubscriptionController::class, 'extend']);
            Route::apiResource('admin/subscriptions', Api\Admin\SubscriptionController::class);

            // Device Management
            Route::apiResource('admin/devices', Api\Admin\DeviceController::class);
            Route::post('admin/devices/{device}/reset', [Api\Admin\DeviceController::class, 'reset']);
            Route::post('admin/devices/{device}/force-logout', [Api\Admin\DeviceController::class, 'forceLogout']);

            // Revenue & Analytics
            Route::get('admin/dashboard', [Api\Admin\DashboardController::class, 'index']);
            Route::get('admin/revenue', [Api\Admin\RevenueController::class, 'index']);
            Route::get('admin/reports/growth', [Api\Admin\ReportController::class, 'growth']);

            // Support Tickets
            Route::apiResource('admin/tickets', Api\Admin\TicketController::class);
            Route::post('admin/tickets/{ticket}/assign', [Api\Admin\TicketController::class, 'assign']);
            Route::post('admin/tickets/{ticket}/resolve', [Api\Admin\TicketController::class, 'resolve']);

            // WhatsApp Usage
            Route::get('admin/whatsapp/usage', [Api\Admin\WhatsAppUsageController::class, 'index']);

            // Email Templates
            Route::get('admin/email-templates', [Api\Admin\EmailTemplateController::class, 'index']);
            Route::get('admin/email-templates/{emailTemplate}', [Api\Admin\EmailTemplateController::class, 'show']);
            Route::put('admin/email-templates/{emailTemplate}', [Api\Admin\EmailTemplateController::class, 'update']);
            Route::get('admin/email-templates/{emailTemplate}/preview', [Api\Admin\EmailTemplateController::class, 'preview']);

            // Promotional Email
            Route::post('admin/email/send-promotional', [Api\Admin\PromoEmailController::class, 'send']);

            // Settings
            Route::get('admin/settings', [Api\Admin\SettingsController::class, 'show']);
            Route::post('admin/settings', [Api\Admin\SettingsController::class, 'update']);
        });
    });
});
