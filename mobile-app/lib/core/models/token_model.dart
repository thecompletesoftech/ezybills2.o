class TokenItemModel {
  const TokenItemModel({required this.name, required this.qty, this.price});

  factory TokenItemModel.fromJson(Map<String, dynamic> json) => TokenItemModel(
        name: json['name'],
        qty: (json['qty'] as num).toDouble(),
        price: json['price'] != null ? (json['price'] as num).toDouble() : null,
      );

  final String name;
  final double qty;
  final double? price;

  Map<String, dynamic> toJson() => {'name': name, 'qty': qty, 'price': price};
}

class TokenModel {
  const TokenModel({
    required this.id,
    required this.businessId,
    required this.tokenNumber,
    required this.tokenTime,
    required this.items,
    required this.status,
    this.tokenAmount,
    this.notes,
  });

  factory TokenModel.fromJson(Map<String, dynamic> json) => TokenModel(
        id: json['id'],
        businessId: json['business_id'],
        tokenNumber: json['token_number'],
        tokenTime: DateTime.parse(json['token_time']),
        tokenAmount: json['token_amount'] != null
            ? (json['token_amount'] as num).toDouble()
            : null,
        items: (json['items'] as List? ?? [])
            .map((e) => TokenItemModel.fromJson(e))
            .toList(),
        status: json['status'] ?? 'pending',
        notes: json['notes'],
      );

  final int id;
  final int businessId;
  final String tokenNumber;
  final DateTime tokenTime;
  final List<TokenItemModel> items;
  final String status;
  final double? tokenAmount;
  final String? notes;

  bool get isPending => status == 'pending';
  bool get isReady => status == 'ready';
  bool get isServed => status == 'served';
  bool get isCancelled => status == 'cancelled';
}
