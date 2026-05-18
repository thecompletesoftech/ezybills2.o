class RestaurantTableModel {
  const RestaurantTableModel({
    required this.id,
    required this.businessId,
    required this.tableNumber,
    required this.seats,
    required this.status,
    required this.isActive,
    this.pendingKotsCount,
  });

  factory RestaurantTableModel.fromJson(Map<String, dynamic> json) =>
      RestaurantTableModel(
        id: json['id'],
        businessId: json['business_id'],
        tableNumber: json['table_number'],
        seats: json['seats'],
        status: json['status'] ?? 'empty',
        isActive: json['is_active'] ?? true,
        pendingKotsCount: json['pending_kots_count'],
      );

  final int id;
  final int businessId;
  final String tableNumber;
  final int seats;
  final String status;
  final bool isActive;
  final int? pendingKotsCount;

  Map<String, dynamic> toJson() => {
        'table_number': tableNumber,
        'seats': seats,
        'status': status,
        'is_active': isActive,
      };

  bool get isEmpty => status == 'empty';
  bool get isOccupied => status == 'occupied';
  bool get isDirty => status == 'dirty';
}
