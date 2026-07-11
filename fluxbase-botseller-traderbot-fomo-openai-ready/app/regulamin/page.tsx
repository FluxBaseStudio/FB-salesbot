import LegalPage from "@/components/public/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage title="Regulamin usługi FluxBase BotSeller">
      <h2>1. Usługodawca i kontakt</h2>
      <p>Usługodawcą jest FluxBase. Kontakt w sprawach zamówień, płatności, reklamacji, anulowania subskrypcji i danych: office@fluxbase.pl.</p>
      <p>Pełne dane identyfikacyjne działalności, w tym firma, adres, NIP oraz dane do faktury, powinny być uzupełnione w stopce strony, dokumentach sprzedaży i wiadomości potwierdzającej zamówienie przed publicznym uruchomieniem sprzedaży.</p>

      <h2>2. Charakter usługi</h2>
      <p>FluxBase BotSeller jest usługą automatyzacji prospectingu B2B. System pomaga wyszukiwać potencjalne firmy, przygotowywać pierwszy kontakt sprzedażowy i wysyłać wiadomości zgodnie z konfiguracją kampanii zaakceptowaną przez klienta.</p>
      <p>Usługa jest kierowana głównie do przedsiębiorców. Jeżeli klient korzysta z ochrony konsumenckiej albo jest przedsiębiorcą na prawach konsumenta, stosuje się bezwzględnie obowiązujące przepisy dotyczące takich klientów.</p>

      <h2>3. Konto, dane i konfiguracja</h2>
      <p>Klient przekazuje dane firmy, opis oferty, grupę docelową, ustawienia kampanii, dane skrzynki oraz dane techniczne potrzebne do realizacji usługi. Klient odpowiada za prawdziwość przekazanych danych oraz za zgodność własnej oferty z prawem.</p>
      <p>FluxBase może odmówić uruchomienia kampanii, wstrzymać ją albo poprosić o zmianę konfiguracji, jeżeli dane są niepełne, nieprawdziwe, ryzykowne, naruszają prawo, dobre praktyki pocztowe albo zasady bezpieczeństwa usługi.</p>

      <h2>4. Zakres działania systemu</h2>
      <p>Bot wysyła pierwszy kontakt i ewentualne follow-upy zgodnie z konfiguracją. Na odpowiedzi od potencjalnych klientów odpowiada człowiek po stronie klienta. System nie gwarantuje liczby sprzedaży, odpowiedzi, spotkań ani podpisanych umów.</p>
      <p>Limity wysyłki, zasięg, liczba wiadomości i funkcje pakietu wynikają z wybranego planu widocznego w formularzu zamówienia oraz w podsumowaniu przed płatnością.</p>

      <h2>5. Płatności, subskrypcja i zawarcie umowy</h2>
      <p>Płatności abonamentowe są obsługiwane przez Stripe zgodnie z wybranym pakietem. Cena, okres rozliczeniowy, zasięg pakietu oraz charakter cykliczny płatności są pokazywane w formularzu i w podsumowaniu przed przejściem do płatności.</p>
      <p>Przejście do płatności jest możliwe dopiero po zaakceptowaniu wymaganych zgód. Zaznaczenie zgód oraz kliknięcie przycisku oznaczonego jako zamówienie z obowiązkiem zapłaty oznacza złożenie zamówienia, akceptację regulaminu, wybranego pakietu, ceny, zakresu usługi oraz warunków cyklicznego rozliczenia abonamentowego.</p>
      <p>Opłacenie pierwszego okresu rozliczeniowego oznacza zawarcie umowy o świadczenie usługi FluxBase BotSeller. Umowa jest zawierana na czas trwania opłaconego okresu rozliczeniowego i przedłuża się automatycznie na każdy kolejny opłacony okres, chyba że klient anuluje subskrypcję przed kolejną płatnością zgodnie z zasadami anulowania.</p>
      <p>Zmiana istotnych warunków subskrypcji, w szczególności ceny, zakresu pakietu lub zasad automatycznego rozliczenia, wymaga poinformowania klienta z wyprzedzeniem. Jeżeli wymaga tego prawo, dalsze korzystanie z usługi na zmienionych warunkach wymaga wyraźnej akceptacji klienta.</p>

      <h2>6. Aktywacja usługi</h2>
      <p>Klient wyraża zgodę na rozpoczęcie realizacji usługi po zaksięgowaniu płatności i po ręcznej weryfikacji danych przez FluxBase. Samo opłacenie zamówienia nie oznacza automatycznego uruchomienia kampanii, ponieważ administrator sprawdza dane firmy, skrzynkę, target, styl wiadomości, limity i zgodność konfiguracji z usługą.</p>
      <p>Jeżeli uruchomienie usługi nie będzie możliwe z przyczyn leżących po stronie klienta, FluxBase kontaktuje się z klientem w celu uzupełnienia danych albo zmiany konfiguracji.</p>

      <h2>7. Zgody wymagane przed płatnością</h2>
      <p>Przed przejściem do Stripe klient musi potwierdzić, że akceptuje regulamin i politykę prywatności, rozumie charakter abonamentowy płatności oraz zgadza się na automatyczne odnawianie umowy przy każdej kolejnej płatności za wybrany pakiet.</p>
      <p>Brak akceptacji wymaganych zgód uniemożliwia przejście do płatności i złożenie zamówienia.</p>

      <h2>8. Anulowanie subskrypcji</h2>
      <p>Klient może zgłosić anulowanie subskrypcji w panelu klienta albo mailowo na office@fluxbase.pl. Po skutecznym anulowaniu subskrypcja nie odnawia się na kolejny okres rozliczeniowy.</p>
      <p>Anulowanie nie cofa automatycznie płatności za już rozpoczęty okres rozliczeniowy, chyba że przepisy prawa, indywidualne ustalenia albo decyzja FluxBase stanowią inaczej.</p>

      <h2>9. Prawo odstąpienia od umowy</h2>
      <p>Jeżeli klientowi przysługuje ustawowe prawo odstąpienia od umowy zawartej na odległość, może z niego skorzystać w terminie i na zasadach wynikających z obowiązujących przepisów. Informacje o odstąpieniu powinny być udostępnione klientowi przed zawarciem umowy oraz po zakupie w potwierdzeniu zamówienia.</p>
      <p>Jeżeli klient żąda rozpoczęcia świadczenia usługi przed upływem terminu na odstąpienie, może mieć obowiązek zapłaty za świadczenia spełnione do chwili odstąpienia, o ile pozwalają na to przepisy.</p>

      <h2>10. Reklamacje</h2>
      <p>Reklamacje dotyczące działania usługi można zgłaszać na office@fluxbase.pl. Zgłoszenie powinno zawierać dane klienta, opis problemu, datę wystąpienia problemu oraz oczekiwany sposób rozwiązania.</p>
      <p>FluxBase odpowiada na reklamację w rozsądnym terminie, nie później niż w terminie wymaganym przez bezwzględnie obowiązujące przepisy.</p>

      <h2>11. Dane osobowe i tajemnice dostępowe</h2>
      <p>Zasady przetwarzania danych opisuje polityka prywatności i informacja RODO. Dane dostępowe do skrzynki są wykorzystywane wyłącznie w celu realizacji usługi i powinny być przekazywane w sposób zgodny z zasadami bezpieczeństwa.</p>

      <h2>12. Postanowienia końcowe</h2>
      <p>Regulamin może być aktualizowany. Zmiany nie powinny naruszać praw nabytych klienta. Istotne zmiany dotyczące trwającej subskrypcji są komunikowane klientowi w sposób umożliwiający zapoznanie się z nimi przed ich wejściem w życie.</p>
    </LegalPage>
  );
}
