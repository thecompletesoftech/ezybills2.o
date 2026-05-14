class InvoiceItemModel {
  final int id;
  final int invoiceId;
  final int productId;
  final String productName;
  final double quantity;
  final double unitPrice;
  final double taxPercentage;
  final double taxAmount;
  final double discountAmount;
  final double total;
  final String? unitName;

  const InvoiceItemModel({
    required this.id,
    required this.invoiceId,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    this.taxPercentage = 0,
    this.taxAmount = 0,
    this.discountAmount = 0,
    required this.total,
    this.unitName,
  });

  factory InvoiceItemModel.fromJson(Map<String, dynamic> json) =>
      InvoiceItemModel(
        id: json['id'] as int,
        invoiceId: json['invoice_id'] as int,
        productId: json['product_id'] as int,
        productName: json['product_name'] as String? ??
            json['product']?['name'] as String? ??
            '',
        quantity: _toDouble(json['quantity']),
        unitPrice: _toDouble(json['unit_price']),
        taxPercentage: _toDouble(json['tax_percentage']),
        taxAmount: _toDouble(json['tax_amount']),
        discountAmount: _toDouble(json['discount_amount']),
        total: _toDouble(json['total']),
        unitName: json['unit_name'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'invoice_id': invoiceId,
        'product_id': productId,
        'product_name': productName,
        'quantity': quantity,
        'unit_price': unitPrice,
        'tax_percentage': taxPercentage,
        'tax_amount': taxAmount,
        'discount_amount': discountAmount,
        'total': total,
      };

  static double _toDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is double) return val;
    if (val is int) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }
}

class PaymentModel {
  final int id;
  final int invoiceId;
  final double amount;
  final String paymentMethod;
  final String? transactionId;
  final DateTime paidAt;

  const PaymentModel({
    required this.id,
    required this.invoiceId,
    required this.amount,
    required this.paymentMethod,
    this.transactionId,
    required this.paidAt,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) => PaymentModel(
        id: json['id'] as int,
        invoiceId: json['invoice_id'] as int,
        amount: _toDouble(json['amount']),
        paymentMethod: json['payment_method'] as String,
        transactionId: json['transaction_id'] as String?,
        paidAt: DateTime.parse(json['paid_at'] as String? ??
            json['created_at'] as String),
      );

  static double _toDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is double) return val;
    if (val is int) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }
}

class InvoiceModel {
  final int id;
  final int businessId;
  final int? customerId;
  final String? customerName;
  final String invoiceNumber;
  final String invoiceType;
  final DateTime invoiceDate;
  final double subtotal;
  final double taxAmount;
  final double discountAmount;
  final double roundOff;
  final double totalAmount;
  final double paidAmount;
  final String paymentStatus;
  final String invoiceStatus;
  final String? notes;
  final int createdBy;
  final List<InvoiceItemModel> items;
  final List<PaymentModel> payments;

  const InvoiceModel({
    required this.id,
    required this.businessId,
    this.customerId,
    this.customerName,
    required this.invoiceNumber,
    required this.invoiceType,
    required this.invoiceDate,
    required this.subtotal,
    this.taxAmount = 0,
    this.discountAmount = 0,
    this.roundOff = 0,
    required this.totalAmount,
    this.paidAmount = 0,
    required this.paymentStatus,
    required this.invoiceStatus,
    this.notes,
    required this.createdBy,
    this.items = const [],
    this.payments = const [],
  });

  factory InvoiceModel.fromJson(Map<String, dynamic> json) => InvoiceModel(
        id: json['id'] as int,
        businessId: json['business_id'] as int,
        customerId: json['customer_id'] as int?,
        customerName: json['customer']?['name'] as String?,
        invoiceNumber: json['invoice_number'] as String,
        invoiceType: json['invoice_type'] as String? ?? 'sale',
        invoiceDate: DateTime.parse(json['invoice_date'] as String),
        subtotal: _toDouble(json['subtotal']),
        taxAmount: _toDouble(json['tax_amount']),
        discountAmount: _toDouble(json['discount_amount']),
        roundOff: _toDouble(json['round_off']),
        totalAmount: _toDouble(json['total_amount']),
        paidAmount: _toDouble(json['paid_amount']),
        paymentStatus: json['payment_status'] as String,
        invoiceStatus: json['invoice_status'] as String,
        notes: json['notes'] as String?,
        createdBy: json['created_by'] as int,
        items: (json['items'] as List<dynamic>?)
                ?.map((e) =>
                    InvoiceItemModel.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        payments: (json['payments'] as List<dynamic>?)
                ?.map(
                    (e) => PaymentModel.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
      );

  bool get isPaid => paymentStatus == 'paid';
  bool get isPending => paymentStatus == 'pending';
  bool get isPartiallyPaid => paymentStatus == 'partially_paid';
  bool get isHeld => invoiceStatus == 'held';
  double get dueAmount => totalAmount - paidAmount;

  static double _toDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is double) return val;
    if (val is int) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }
}

// Used for building a cart before creating an invoice
class CartItem {
  final int productId;
  final String productName;
  final double unitPrice;
  double quantity;
  final double taxPercentage;
  double discountAmount;
  final String? unitName;
  final String? barcode;

  CartItem({
    required this.productId,
    required this.productName,
    required this.unitPrice,
    this.quantity = 1,
    this.taxPercentage = 0,
    this.discountAmount = 0,
    this.unitName,
    this.barcode,
  });

  double get lineTotal {
    final base = unitPrice * quantity;
    final tax = base * taxPercentage / 100;
    return base + tax - discountAmount;
  }
}
