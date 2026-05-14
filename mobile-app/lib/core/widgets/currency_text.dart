import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

final _currencyFormat = NumberFormat.currency(
  locale: 'en_IN',
  symbol: '₹',
  decimalDigits: 2,
);

class CurrencyText extends StatelessWidget {
  const CurrencyText(
    this.amount, {
    super.key,
    this.style,
    this.color,
    this.bold = false,
  });

  final double amount;
  final TextStyle? style;
  final Color? color;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    final base = style ?? const TextStyle();
    return Text(
      formatCurrency(amount),
      style: base.copyWith(
        color: color,
        fontWeight: bold ? FontWeight.bold : base.fontWeight,
      ),
    );
  }
}

String formatCurrency(double amount) => _currencyFormat.format(amount);
