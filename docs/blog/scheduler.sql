-- OPTIONAL / NOT APPLIED. Owner approval and a configured Supabase Cron extension
-- are required. Run as the database owner in the SAME PartSolved project.
-- Inspect existing jobs first; do not duplicate or replace unrelated jobs.
select jobid, jobname, schedule, active from cron.job where jobname='partsolved-blog-publish';
-- cron.schedule updates this named job rather than creating repeated unnamed jobs.
select cron.schedule('partsolved-blog-publish', '* * * * *', $$select public.blog_publish_due();$$);
-- Confirm successful execution before setting BLOG_SCHEDULER_READY=true.
select jobid, status, start_time, end_time, return_message from cron.job_run_details
where jobid in (select jobid from cron.job where jobname='partsolved-blog-publish')
order by start_time desc limit 20;
select id, scheduled_at, job_error from public.blog_posts where status='scheduled' order by scheduled_at;
