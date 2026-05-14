import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class ShimmerList extends StatelessWidget {
  const ShimmerList({super.key, this.itemCount = 8, this.itemHeight = 72});

  final int itemCount;
  final double itemHeight;

  @override
  Widget build(BuildContext context) => Shimmer.fromColors(
        baseColor: Colors.grey.shade300,
        highlightColor: Colors.grey.shade100,
        child: ListView.separated(
          itemCount: itemCount,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (_, __) => Container(
            height: itemHeight,
            color: Colors.white,
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          ),
        ),
      );
}

class ShimmerCard extends StatelessWidget {
  const ShimmerCard({super.key, this.height = 120});

  final double height;

  @override
  Widget build(BuildContext context) => Shimmer.fromColors(
        baseColor: Colors.grey.shade300,
        highlightColor: Colors.grey.shade100,
        child: Container(
          height: height,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      );
}
