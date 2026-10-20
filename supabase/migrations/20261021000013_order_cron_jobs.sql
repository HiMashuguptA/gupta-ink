-- Background jobs: cancel unpaid UPI orders after 30 minutes, uncollected pickups after 48 hours
create extension if not exists pg_cron;
select cron.schedule('gi-expire-unpaid-upi', '*/5 * * * *', 'select public._expire_unpaid_upi()');
select cron.schedule('gi-expire-pickups', '7,37 * * * *', 'select public._expire_pickups()');
