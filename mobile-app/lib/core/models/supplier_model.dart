class SupplierModel {
  final int id;
  final int businessId;
  final String name;
  final String? phone;
  final String? email;
  final String? gstNumber;
  final String? address;
  final double dueAmount;
  final double totalPurchases;
  final bool isActive;

  const SupplierModel({
    required this.id,
    required this.businessId,
    required this.name,
    this.phone,
    this.email,
    this.gstNumber,
    this.address,
    this.dueAmount = 0,
    this.totalPurchases = 0,
    required this.isActive,
  });

  factory SupplierModel.fromJson(Map<String, dynamic> json) => SupplierModel(
        id: json['id'] as int,
        businessId: json['business_id'] as int,
        name: json['name'] as String,
        phone: json['phone'] as String?,
        email: json['email'] as String?,
        gstNumber: json['gst_number'] as String?,
        address: json['address'] as String?,
        dueAmount: _toDouble(json['due_amount']),
        totalPurchases: _toDouble(json['total_purchases']),
        isActive: (json['is_active'] as bool?) ?? true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'business_id': businessId,
        'name': name,
        'phone': phone,
        'email': email,
        'gst_number': gstNumber,
        'address': address,
        'due_amount': dueAmount,
        'total_purchases': totalPurchases,
        'is_active': isActive,
      };

  bool get hasDue => dueAmount > 0;

  static double _toDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is double) return val;
    if (val is int) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }
}
