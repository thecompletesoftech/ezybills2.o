import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/invoice_model.dart';
import '../models/customer_model.dart';

class CartState {
  const CartState({
    this.items = const [],
    this.customer,
    this.discountAmount = 0,
    this.notes,
    this.tableId,
  });

  final List<CartItem> items;
  final CustomerModel? customer;
  final double discountAmount;
  final String? notes;
  final int? tableId;

  double get subtotal =>
      items.fold(0, (sum, item) => sum + item.unitPrice * item.quantity);

  // Tax shown on receipt (extracted for inclusive, added for exclusive)
  double get taxTotal => items.fold(0.0, (sum, item) {
    final base = item.unitPrice * item.quantity - item.discountAmount;
    if (item.taxType == 'inclusive') {
      return item.taxPercentage > 0
          ? sum + base * item.taxPercentage / (100 + item.taxPercentage)
          : sum;
    }
    return sum + base * item.taxPercentage / 100;
  });

  double get itemDiscountTotal =>
      items.fold(0, (sum, item) => sum + item.discountAmount);

  // Actual amount the customer pays
  double get total =>
      items.fold(0.0, (sum, item) => sum + item.lineTotal) - discountAmount;

  int get itemCount => items.fold(0, (sum, item) => sum + item.quantity.toInt());

  bool get isEmpty => items.isEmpty;

  CartState copyWith({
    List<CartItem>? items,
    CustomerModel? customer,
    bool clearCustomer = false,
    double? discountAmount,
    String? notes,
    int? tableId,
  }) =>
      CartState(
        items: items ?? this.items,
        customer: clearCustomer ? null : (customer ?? this.customer),
        discountAmount: discountAmount ?? this.discountAmount,
        notes: notes ?? this.notes,
        tableId: tableId ?? this.tableId,
      );
}

class CartNotifier extends StateNotifier<CartState> {
  CartNotifier() : super(const CartState());

  void addProduct({
    required int productId,
    required String productName,
    required double unitPrice,
    double taxPercentage = 0,
    String taxType = 'exclusive',
    String? unitName,
    String? barcode,
  }) {
    final existing = state.items.indexWhere((i) => i.productId == productId);
    if (existing >= 0) {
      final updated = List<CartItem>.from(state.items);
      updated[existing].quantity++;
      state = state.copyWith(items: updated);
    } else {
      state = state.copyWith(items: [
        ...state.items,
        CartItem(
          productId: productId,
          productName: productName,
          unitPrice: unitPrice,
          taxPercentage: taxPercentage,
          taxType: taxType,
          unitName: unitName,
          barcode: barcode,
        ),
      ]);
    }
  }

  void updateQuantity(int productId, double quantity) {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    final updated = state.items.map((item) {
      if (item.productId == productId) item.quantity = quantity;
      return item;
    }).toList();
    state = state.copyWith(items: updated);
  }

  void updateDiscount(int productId, double discount) {
    final updated = state.items.map((item) {
      if (item.productId == productId) item.discountAmount = discount;
      return item;
    }).toList();
    state = state.copyWith(items: updated);
  }

  void removeItem(int productId) {
    state = state.copyWith(
      items: state.items.where((i) => i.productId != productId).toList(),
    );
  }

  void setCustomer(CustomerModel? customer) {
    state = customer == null
        ? state.copyWith(clearCustomer: true)
        : state.copyWith(customer: customer);
  }

  void setDiscount(double amount) {
    state = state.copyWith(discountAmount: amount);
  }

  void setNotes(String notes) {
    state = state.copyWith(notes: notes);
  }

  void setTable(int? tableId) {
    state = state.copyWith(tableId: tableId);
  }

  void clear() {
    state = const CartState();
  }
}

extension CartStatePayload on CartState {
  // Builds the POST /invoices payload. payment_mode and payment_status are
  // added by the caller (payment screen), not here.
  Map<String, dynamic> toInvoicePayload({double extraDiscountAmount = 0}) => {
        'customer_id': customer?.id,
        'invoice_type': 'retail_invoice',
        if (discountAmount + extraDiscountAmount > 0)
          'discount_amount': discountAmount + extraDiscountAmount,
        if (notes != null && notes!.isNotEmpty) 'notes': notes,
        if (tableId != null) 'table_id': tableId,
        'items': items
            .map((item) => {
                  'product_id': item.productId,
                  'quantity': item.quantity,
                  'unit_price': item.unitPrice,
                  // per-item discount sent as %; global discount handled at invoice level
                  'discount_percentage': item.discountAmount > 0 &&
                          item.unitPrice * item.quantity > 0
                      ? item.discountAmount /
                          (item.unitPrice * item.quantity) *
                          100
                      : 0.0,
                })
            .toList(),
      };

  Map<String, dynamic> toKotPayload() => {
        if (tableId != null) 'table_id': tableId,
        if (notes != null && notes!.isNotEmpty) 'notes': notes,
        'items': items
            .map((item) => {
                  'product_id': item.productId,
                  'product_name': item.productName,
                  'quantity': item.quantity,
                })
            .toList(),
      };
}

final cartProvider = StateNotifierProvider<CartNotifier, CartState>(
  (ref) => CartNotifier(),
);
