import 'package:flutter_test/flutter_test.dart';
import 'package:sihati_mobile/app.dart';
import 'package:sihati_mobile/core/config/app_config.dart';

void main() {
  testWidgets('renders Sihati landing screen actions', (tester) async {
    const config = AppConfig(
      environment: AppEnvironment.development,
      apiBaseUrl: 'http://localhost:3000',
    );

    await tester.pumpWidget(const SihatiApp(config: config));

    expect(find.text('Sihati'), findsOneWidget);
    expect(
      find.text(
        'Book an appointment with a healthcare professional in Morocco',
      ),
      findsOneWidget,
    );
    expect(find.text('Find a practitioner'), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);
    expect(find.text('Join as practitioner'), findsOneWidget);
  });
}
