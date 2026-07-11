# Campaign strict search terms fix

Poprawka po obserwacji, że bot szukał firm spoza kampanii.

## Zmienione

1. Google Places używa teraz tylko pól operacyjnych targetu:
   - `search_keywords`,
   - `target_industries` / „Jakich firm szukamy”,
   - `exact_target_business_type`,
   - `target_audience_niche`.

2. Pola opisowe nie sterują już bezpośrednio wyszukiwarką, jeśli istnieją konkretne frazy targetu:
   - `target_business_activities`,
   - `target_customer_description`,
   - `preferred_lead_profile`.

3. Dodano log `search_terms`, który pokazuje w panelu, jakie frazy bot faktycznie wysyła do Google.

4. Rozszerzono rozpoznawanie targetów tekstylnych o frazy typu:
   - producent odzieży,
   - producent odzieży codziennej,
   - producent tekstyliów,
   - firma tekstylna,
   - drukarnia sublimacyjna,
   - pracownia krawiecka.

## Efekt

Bot nie powinien już szukać po ogólnych opisach typu „B2B” albo „wykorzystują tkaniny”. Najpierw idzie po konkretnych typach firm z kampanii, a opis aktywności zostawia do oceny AI i personalizacji wiadomości.
