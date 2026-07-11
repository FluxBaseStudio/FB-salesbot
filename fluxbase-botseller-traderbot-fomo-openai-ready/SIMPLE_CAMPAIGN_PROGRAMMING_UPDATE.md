# Aktualizacja: proste programowanie kampanii

W panelu admina uproszczono tworzenie i edycję kampanii. Zamiast wielu pól precyzujących target, formularz prowadzi admina przez kilka kluczowych pytań:

1. Jakich firm szukamy?
2. Czym zajmują się te firmy?
3. Czym my się zajmujemy?
4. Jaką ofertę proponujemy?
5. Przykładowy mail.
6. Czego bot ma unikać?

Techniczne ustawienia kampanii, takie jak limit dzienny, godziny pracy, weekendy, akceptacja przed wysyłką, test mode, follow-upy i załączniki zostały niżej jako ustawienia operacyjne.

Nowy prosty formularz nadal zapisuje dane do istniejących pól kampanii, więc logika bota, AI scoring, wyszukiwanie leadów, generowanie maili i podgląd wiadomości działają bez migracji bazy danych.

Dodatkowo pole tekstowe w panelu admina obsługuje placeholdery, żeby łatwiej pokazywać przykłady przy wypełnianiu kampanii.

Build Next.js przeszedł kompilację, TypeScript i generowanie routingu. Proces zakończył pełną tabelę routingu, ale sandbox przerwał komendę przez limit czasu po finalizacji.
