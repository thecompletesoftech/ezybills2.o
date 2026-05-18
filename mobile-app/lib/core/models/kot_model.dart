class KotItemModel {
  const KotItemModel({required this.name, required this.qty, this.notes});

  factory KotItemModel.fromJson(Map<String, dynamic> json) => KotItemModel(
        name: json['name'],
        qty: (json['qty'] as num).toDouble(),
        notes: json['notes'],
      );

  final String name;
  final double qty;
  final String? notes;

  Map<String, dynamic> toJson() => {'name': name, 'qty': qty, 'notes': notes};
}

class KotModel {
  const KotModel({
    required this.id,
    required this.businessId,
    this.tableId,
    required this.tableNumber,
    required this.kotNumber,
    required this.kotTime,
    required this.items,
    required this.status,
    this.notes,
  });

  factory KotModel.fromJson(Map<String, dynamic> json) => KotModel(
        id: json['id'],
        businessId: json['business_id'],
        tableId: json['table_id'],
        tableNumber: json['table']?['table_number'] ?? '',
        kotNumber: json['kot_number'],
        kotTime: DateTime.parse(json['kot_time']),
        items: (json['items'] as List? ?? [])
            .map((e) => KotItemModel.fromJson(e))
            .toList(),
        status: json['status'] ?? 'pending',
        notes: json['notes'],
      );

  final int id;
  final int businessId;
  final int? tableId;
  final String tableNumber;
  final String kotNumber;
  final DateTime kotTime;
  final List<KotItemModel> items;
  final String status;
  final String? notes;

  bool get isPending => status == 'pending';
  bool get isInProgress => status == 'in_progress';
  bool get isCompleted => status == 'completed';
  bool get isCancelled => status == 'cancelled';
  bool get isActive => isPending || isInProgress;
}
