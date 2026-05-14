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

  double get taxTotal =>
      items.fold(0, (sum, item) =>
          sum + (item.unitPrice * item.quantity * item.taxPercentage / 100));

  double get itemDiscountTotal =>
      items.fold(0, (sum, item) => sum + item.discountAmount);

  double get total =>
      subtotal + taxTotal - itemDiscountTotal - discountAmount;

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
  Map<String, dynamic> toInvoicePayload() => {
        'customer_id': customer?.id,
        'invoice_type': 'sale',
        'invoice_date': DateTime.now().toIso8601String(),
        'subtotal': subtotal,
        'tax_amount': taxTotal,
        'discount_amount': discountAmount + itemDiscountTotal,
        'total_amount': total,
        'notes': notes,
        'table_id': tableId,
        'items': items
            .map((item) => {
                  'product_id': item.productId,
                  'product_name': item.productName,
                  'quantity': item.quantity,
                  'unit_price': item.unitPrice,
                  'tax_percentage': item.taxPercentage,
                  'tax_amount':
                      item.unitPrice * item.quantity * item.taxPercentage / 100,
                  'discount_amount': item.discountAmount,
                  'total': item.lineTotal,
                })
            .toList(),
      };
}

final cartProvider = StateNotifierProvider<CartNotifier, CartState>(
  (ref) => CartNotifier(),
);
