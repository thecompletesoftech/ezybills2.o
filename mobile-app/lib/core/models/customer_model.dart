class CustomerModel {
  final int id;
  final int businessId;
  final String name;
  final String? phone;
  final String? email;
  final String? gstNumber;
  final String? address;
  final int? groupId;
  final double creditLimit;
  final double dueAmount;
  final double totalPurchases;
  final bool isActive;

  const CustomerModel({
    required this.id,
    required this.businessId,
    required this.name,
    this.phone,
    this.email,
    this.gstNumber,
    this.address,
    this.groupId,
    this.creditLimit = 0,
    this.dueAmount = 0,
    this.totalPurchases = 0,
    required this.isActive,
  });

  factory CustomerModel.fromJson(Map<String, dynamic> json) => CustomerModel(
        id: json['id'] as int,
        businessId: json['business_id'] as int,
        name: json['name'] as String,
        phone: json['phone'] as String?,
        email: json['email'] as String?,
        gstNumber: json['gst_number'] as String?,
        address: json['address'] as String?,
        groupId: json['group_id'] as int?,
        creditLimit: _toDouble(json['credit_limit']),
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
        'group_id': groupId,
        'credit_limit': creditLimit,
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

class CustomerLedgerEntry {
  final int id;
  final int customerId;
  final String type;
  final double amount;
  final double balance;
  final String? description;
  final DateTime createdAt;

  const CustomerLedgerEntry({
    required this.id,
    required this.customerId,
    required this.type,
    required this.amount,
    required this.balance,
    this.description,
    required this.createdAt,
  });

  factory CustomerLedgerEntry.fromJson(Map<String, dynamic> json) =>
      CustomerLedgerEntry(
        id: json['id'] as int,
        customerId: json['customer_id'] as int,
        type: json['type'] as String,
        amount: _toDouble(json['amount']),
        balance: _toDouble(json['balance']),
        description: json['description'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  bool get isCredit => type == 'credit';

  static double _toDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is double) return val;
    if (val is int) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }
}
