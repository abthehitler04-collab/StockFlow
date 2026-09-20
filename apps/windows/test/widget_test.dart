import 'package:flutter_test/flutter_test.dart';

import 'package:stockflow_windows/main.dart';

void main() {
  testWidgets('StockFlow desktop app loads the login screen', (WidgetTester tester) async {
    await tester.pumpWidget(const StockFlowWindowsApp());

    expect(find.text('StockFlow Desktop'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });
}
