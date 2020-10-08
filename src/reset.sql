drop schema public cascade;
drop schema postgraphile_watch cascade;

create schema public;
create schema postgraphile_watch;
ALTER SCHEMA postgraphile_watch OWNER TO postgres;


