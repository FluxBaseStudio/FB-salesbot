-- Opcjonalne czyszczenie panelu po przejściu na tryb "tylko wysłane".
-- Uruchom w Supabase SQL Editor tylko wtedy, gdy chcesz usunąć stare szkice,
-- błędy wysyłki, rekordy bez emaila i niewysłane leady z poprzednich wersji.

begin;

-- Kasuje stare wiadomości, które nie są faktycznie wysłane albo nie są statusem po wysyłce.
delete from messages
where status in ('draft', 'queued', 'sending', 'failed', 'skipped_no_email')
   or (sent_at is null and status not in ('sent', 'delivered', 'opened', 'replied', 'follow_up_scheduled', 'follow_up_sent', 'bounced', 'spam', 'unsubscribed'));

-- Kasuje stare leady bez emaila i leady niewysłane.
-- Leady z wysłanymi wiadomościami zostają w panelu.
delete from leads
where email is null
   or status in ('new', 'email_found', 'email_missing', 'draft_generated', 'approved', 'failed', 'skipped_no_email')
   or status <> 'sent';

commit;
