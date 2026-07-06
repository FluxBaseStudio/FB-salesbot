# Update: skrzynki wysyłkowe, upsell i szkice zamówień

Dodano:

1. Publiczny formularz `/botseller`
   - wybór trybu konfiguracji skrzynki:
     - klient sam podłącza Gmail/SMTP,
     - FluxBase zakłada skrzynkę za klienta,
   - pole głównego maila do odpowiedzi,
   - preferowana nazwa skrzynki,
   - opcja dodatkowej skrzynki +50 maili dziennie za 599 zł/mies.,
   - automatyczny zapis kroków formularza do `signup_orders` jako szkic.

2. Panel admina
   - zamówienia pokazują etap onboardingu,
   - status `draft`,
   - tryb skrzynki,
   - główny mail odpowiedzi,
   - informację o dodatkowej skrzynce i łącznym limicie dziennym.

3. Stripe
   - checkout główny obsługuje dodatkową skrzynkę jako drugi line item,
   - wymagane ENV: `STRIPE_PRICE_ADDITIONAL_MAILBOX`,
   - jeśli klient wybiera konfigurację skrzynki przez FluxBase, checkout nie wymaga testu SMTP.

4. Panel klienta
   - w zakładce subskrypcji dodano przycisk dodania drugiej skrzynki za 599 zł/mies.
   - endpoint: `/api/client-portal/add-mailbox-checkout`.

5. Baza danych
   - dodano kolumny do `signup_orders` dotyczące onboardingu i skrzynek,
   - dodano tabelę `client_sending_mailboxes` pod dalszą obsługę wielu skrzynek.

Build: `npm run build` przeszedł poprawnie.
