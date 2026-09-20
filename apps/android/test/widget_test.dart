import 'package:flutter_test/flutter_test.dart';

import 'package:stockflow_android/main.dart';

void main() {
  testWidgets('StockFlow app loads the login screen', (WidgetTester tester) async {
    await tester.pumpWidget(const StockFlowAndroidApp());

    expect(find.text('StockFlow Mobile'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });
}
