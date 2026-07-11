import LegalPage from "@/components/public/LegalPage";

export default function RodoPage() {
  return (
    <LegalPage title="Informacja RODO">
      <h2>1. Administrator i kontakt</h2>
      <p>Administratorem danych osobowych jest FluxBase. Kontakt: office@fluxbase.pl. Pełne dane identyfikacyjne administratora należy uzupełnić przed publiczną sprzedażą usługi.</p>

      <h2>2. Kategorie danych</h2>
      <p>Przetwarzamy dane klientów, użytkowników panelu, dane zamówienia, dane kampanii, dane rozliczeniowe, dane techniczne oraz publiczne dane firmowe wykorzystywane w kampaniach B2B.</p>

      <h2>3. Cele przetwarzania</h2>
      <p>Dane są przetwarzane w celu zawarcia i realizacji umowy, obsługi płatności, konfiguracji i prowadzenia kampanii, kontaktu z klientem, obsługi reklamacji, bezpieczeństwa, rozliczeń oraz dochodzenia lub obrony roszczeń.</p>

      <h2>4. Prawa osób</h2>
      <p>Osobie, której dane dotyczą, przysługuje prawo dostępu do danych, sprostowania, usunięcia, ograniczenia przetwarzania, sprzeciwu, przenoszenia danych, cofnięcia zgody oraz wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych w przypadkach przewidzianych prawem.</p>

      <h2>5. Dane w kampaniach</h2>
      <p>System może przetwarzać publiczne dane firmowe potrzebne do przygotowania pierwszego kontaktu sprzedażowego. Kontakty z listy sprzeciwu są blokowane przez suppression list i nie powinny być ponownie używane w kampaniach.</p>

      <h2>6. Okres przechowywania</h2>
      <p>Dane są przechowywane przez czas niezbędny do realizacji usługi, obowiązków rozliczeniowych, obsługi ewentualnych roszczeń, bezpieczeństwa oraz wymogów wynikających z przepisów prawa.</p>

      <h2>7. Dostawcy i transfery</h2>
      <p>Dane mogą być powierzane dostawcom technicznym i płatniczym, takim jak Supabase, Stripe, OpenAI, Google APIs, dostawcy poczty, hostingu i księgowości. Jeżeli dochodzi do transferu poza EOG, powinien on odbywać się zgodnie z mechanizmami ochrony wymaganymi przez RODO.</p>
    </LegalPage>
  );
}
