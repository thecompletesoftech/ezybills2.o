class ExpenseCategoryModel {
  final int id;
  final int businessId;
  final String name;

  const ExpenseCategoryModel({
    required this.id,
    required this.businessId,
    required this.name,
  });

  factory ExpenseCategoryModel.fromJson(Map<String, dynamic> json) =>
      ExpenseCategoryModel(
        id: json['id'] as int,
        businessId: json['business_id'] as int,
        name: json['name'] as String,
      );
}

class ExpenseModel {
  final int id;
  final int businessId;
  final int? categoryId;
  final String? categoryName;
  final String title;
  final double amount;
  final DateTime expenseDate;
  final String? notes;

  const ExpenseModel({
    required this.id,
    required this.businessId,
    this.categoryId,
    this.categoryName,
    required this.title,
    required this.amount,
    required this.expenseDate,
    this.notes,
  });

  factory ExpenseModel.fromJson(Map<String, dynamic> json) => ExpenseModel(
        id: json['id'] as int,
        businessId: json['business_id'] as int,
        categoryId: json['category_id'] as int?,
        categoryName: json['category']?['name'] as String?,
        title: json['title'] as String,
        amount: _toDouble(json['amount']),
        expenseDate: DateTime.parse(json['expense_date'] as String),
        notes: json['notes'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'business_id': businessId,
        'category_id': categoryId,
        'title': title,
        'amount': amount,
        'expense_date': expenseDate.toIso8601String().split('T').first,
        'notes': notes,
      };

  static double _toDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is double) return val;
    if (val is int) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }
}
