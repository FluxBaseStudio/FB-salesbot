# BotSeller – rozszerzone szukanie biznesów i precyzja targetu

W tej wersji dopracowano dodawanie kampanii i logikę kwalifikacji leadów.

## Nowe pola w kampanii

Dodano rozszerzoną sekcję: „Rozszerzone szukanie biznesów i grupa odbiorców”.

Nowe pola:
- Docelowa grupa odbiorców / nisza
- Osoba decyzyjna
- Model biznesu targetu
- Etap rozwoju firmy
- Segment cenowy / budżet targetu
- Sygnały online wymagane przy sprawdzaniu
- Zasady kwalifikacji leada
- Zasady dyskwalifikacji leada

Pola są dostępne w:
- dodawaniu kampanii w panelu admina,
- kampaniach klienta w panelu admina,
- edycji kampanii,
- zamówieniach BotSeller,
- publicznym formularzu `/botseller`.

## Lepsze szukanie leadów

Bot buduje zapytania Google Places nie tylko z podstawowych branż, ale też z:
- docelowej niszy,
- konkretnych typów firm,
- czynności/usług targetu,
- słów kluczowych,
- modelu biznesowego targetu.

## Lepsze sprawdzanie leadów

Przed szukaniem maila bot odrzuca firmy, które pasują do:
- słów wykluczających,
- firm wykluczonych,
- zasad dyskwalifikacji.

Po audycie strony i analizie AI bot odrzuca leady, których score jest za niski.
Domyślnie minimum to `4/10`.

Można to zmienić przez env:

```env
MIN_QUALIFIED_LEAD_SCORE=4
```

Leady odrzucone nie zapisują się w panelu. Panel nadal pokazuje tylko realnie wysłane leady i wiadomości.

## Baza danych

Po wdrożeniu trzeba odpalić:

```txt
supabase/schema.sql
```

Doda to nowe kolumny w tabelach:
- `campaigns`,
- `signup_orders`.
