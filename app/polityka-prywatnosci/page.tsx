import LegalPage from "@/components/public/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage title="Polityka prywatności">
      <h2>1. Administrator danych</h2>
      <p>Administratorem danych przetwarzanych w ramach usługi jest FluxBase. Kontakt w sprawach prywatności: office@fluxbase.pl.</p>
      <p>Przed publicznym uruchomieniem sprzedaży należy uzupełnić pełne dane identyfikacyjne administratora: firmę, adres, NIP oraz ewentualny kontakt do inspektora ochrony danych, jeżeli został wyznaczony.</p>

      <h2>2. Jakie dane przetwarzamy?</h2>
      <p>Przetwarzamy dane podane w formularzu zamówienia, dane kontaktowe, dane firmowe, dane kampanii, dane SMTP, informacje o subskrypcji i płatnościach, dane techniczne, logi bezpieczeństwa oraz statystyki działania kampanii.</p>
      <p>W ramach kampanii mogą być przetwarzane publicznie dostępne dane firm i osób kontaktowych, jeżeli są potrzebne do przygotowania pierwszego kontaktu B2B.</p>

      <h2>3. Cele i podstawy przetwarzania</h2>
      <p>Dane przetwarzamy w celu obsługi zamówień, zawarcia i wykonania umowy, prowadzenia kampanii, obsługi płatności, wystawienia faktur, kontaktu z klientem, zapewnienia bezpieczeństwa systemu, dochodzenia lub obrony roszczeń oraz wykonania obowiązków prawnych.</p>
      <p>Podstawami przetwarzania mogą być: wykonanie umowy, obowiązek prawny, prawnie uzasadniony interes administratora oraz zgoda, jeżeli w danym miejscu jest wymagana.</p>

      <h2>4. Odbiorcy danych i dostawcy usług</h2>
      <p>Dane mogą być przekazywane dostawcom usług technicznych i biznesowych w zakresie niezbędnym do działania usługi, w szczególności: Supabase, Stripe, OpenAI, Google APIs, dostawcom poczty SMTP, hostingu, księgowości, narzędzi bezpieczeństwa i obsługi klienta.</p>
      <p>Jeżeli dane są przekazywane poza Europejski Obszar Gospodarczy, odbywa się to na podstawie odpowiednich mechanizmów ochrony danych wymaganych przez RODO.</p>

      <h2>5. Okres przechowywania</h2>
      <p>Dane przechowujemy przez czas trwania umowy, a następnie przez okres potrzebny do rozliczeń, obsługi reklamacji, zabezpieczenia roszczeń, wykonania obowiązków księgowych i podatkowych oraz bezpieczeństwa systemu.</p>
      <p>Dane techniczne i logi mogą być przechowywane krócej, jeżeli nie są już potrzebne do bezpieczeństwa, diagnostyki lub rozliczeń.</p>

      <h2>6. Prawa osób</h2>
      <p>Osobie, której dane dotyczą, może przysługiwać prawo dostępu do danych, sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia danych, sprzeciwu, cofnięcia zgody oraz wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych.</p>
      <p>Żądania dotyczące danych można kierować na office@fluxbase.pl.</p>

      <h2>7. Zautomatyzowane działania</h2>
      <p>Usługa wykorzystuje automatyzację i AI do wspierania prospectingu oraz przygotowywania treści wiadomości. Ostateczna konfiguracja kampanii i aktywacja usługi są wykonywane po ręcznej weryfikacji przez FluxBase.</p>

      <h2>8. Bezpieczeństwo</h2>
      <p>Stosujemy środki techniczne i organizacyjne mające ograniczać ryzyko nieuprawnionego dostępu do danych, w tym ograniczenia dostępu, szyfrowanie wybranych tajemnic technicznych, logi działań administracyjnych i kontrolę uprawnień.</p>
    </LegalPage>
  );
}
