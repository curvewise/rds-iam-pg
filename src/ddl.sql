--
-- PostgreSQL database dump
--

-- Dumped from database version 10.10
-- Dumped by pg_dump version 10.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: DATABASE postgres; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON DATABASE postgres IS 'default administrative connection database';


--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- Name: notify_watchers_ddl(); Type: FUNCTION; Schema: postgraphile_watch; Owner: postgres
--

CREATE FUNCTION postgraphile_watch.notify_watchers_ddl() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
begin
  perform pg_notify(
    'postgraphile_watch',
    json_build_object(
      'type',
      'ddl',
      'payload',
      (select json_agg(json_build_object('schema', schema_name, 'command', command_tag)) from pg_event_trigger_ddl_commands() as x)
    )::text
  );
end;
$$;


ALTER FUNCTION postgraphile_watch.notify_watchers_ddl() OWNER TO postgres;

--
-- Name: notify_watchers_drop(); Type: FUNCTION; Schema: postgraphile_watch; Owner: postgres
--

CREATE FUNCTION postgraphile_watch.notify_watchers_drop() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
begin
  perform pg_notify(
    'postgraphile_watch',
    json_build_object(
      'type',
      'drop',
      'payload',
      (select json_agg(distinct x.schema_name) from pg_event_trigger_dropped_objects() as x)
    )::text
  );
end;
$$;


ALTER FUNCTION postgraphile_watch.notify_watchers_drop() OWNER TO postgres;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.batches (
    id integer NOT NULL,
    name character varying(50),
    units character varying(2),
    reference_frame_up integer[],
    reference_frame_look integer[],
    CONSTRAINT batches_reference_frame_look_check CHECK ((array_length(reference_frame_look, 1) = 3)),
    CONSTRAINT batches_reference_frame_up_check CHECK ((array_length(reference_frame_up, 1) = 3))
);


ALTER TABLE public.batches OWNER TO postgres;

--
-- Name: batches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.batches_id_seq OWNER TO postgres;

--
-- Name: batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.batches_id_seq OWNED BY public.batches.id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    content text
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.comments_id_seq OWNER TO postgres;

--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: computed_points; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.computed_points (
    vertex double precision[],
    id integer NOT NULL,
    name character varying(50),
    body integer NOT NULL,
    CONSTRAINT computed_points_vertex_check CHECK ((array_length(vertex, 1) = 3))
);


ALTER TABLE public.computed_points OWNER TO postgres;

--
-- Name: computed_points_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.computed_points_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.computed_points_id_seq OWNER TO postgres;

--
-- Name: computed_points_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.computed_points_id_seq OWNED BY public.computed_points.id;




--
-- Name: curves; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.curves (
    id integer NOT NULL,
    name character varying(50),
    is_closed boolean,
    vertices double precision[],
    body integer NOT NULL,
    CONSTRAINT curves_vertices_check CHECK ((array_length(vertices, 2) = 3))
);


ALTER TABLE public.curves OWNER TO postgres;

--
-- Name: curves_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.curves_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.curves_id_seq OWNER TO postgres;

--
-- Name: curves_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.curves_id_seq OWNED BY public.curves.id;



--
-- Name: labels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.labels (
    id integer NOT NULL,
    name character varying(50)
);


ALTER TABLE public.labels OWNER TO postgres;

--
-- Name: labels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.labels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.labels_id_seq OWNER TO postgres;

--
-- Name: labels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.labels_id_seq OWNED BY public.labels.id;


--
-- Name: landmarks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.landmarks (
    vertex double precision[],
    id integer NOT NULL,
    landmark_name character varying(50),
    landmark_set_name character varying(50),
    body integer NOT NULL,
    CONSTRAINT landmarks_vertex_check CHECK ((array_length(vertex, 1) = 3))
);


ALTER TABLE public.landmarks OWNER TO postgres;

--
-- Name: landmarks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.landmarks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.landmarks_id_seq OWNER TO postgres;

--
-- Name: landmarks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.landmarks_id_seq OWNED BY public.landmarks.id;


--
-- Name: measured_bodies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.measured_bodies (
    id integer NOT NULL,
    name character varying(50),
    s3_bucket character varying(50),
    s3_path character varying(50),
    tape_width double precision,
    gender character(1),
    pose character varying(50),
    batch integer NOT NULL
);


ALTER TABLE public.measured_bodies OWNER TO postgres;

--
-- Name: measured_bodies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.measured_bodies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.measured_bodies_id_seq OWNER TO postgres;

--
-- Name: measured_bodies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.measured_bodies_id_seq OWNED BY public.measured_bodies.id;



--
-- Name: values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."values" (
    id integer NOT NULL,
    name character varying(50),
    value double precision,
    units character varying(2),
    body integer NOT NULL
);


ALTER TABLE public."values" OWNER TO postgres;

--
-- Name: values_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.values_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.values_id_seq OWNER TO postgres;

--
-- Name: values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.values_id_seq OWNED BY public."values".id;

--feedback_assocations table


CREATE TABLE public.feedback_associations (
    id integer NOT NULL,
    body integer,
    landmark integer,
    computed_point integer,
    value integer,
    curve integer,
    comment integer,
    label integer
);


CREATE SEQUENCE public.feedback_associations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.feedback_associations_id_seq OWNED BY public.feedback_associations.id;

ALTER TABLE ONLY public.feedback_associations ALTER COLUMN id SET DEFAULT nextval('public.feedback_associations_id_seq'::regclass);

SELECT pg_catalog.setval('public.feedback_associations_id_seq', 1, false);

-- measured_body_views

CREATE TABLE public.measured_body_views (
  id integer NOT NULL,
  version integer,
  is_perspective boolean,
  PRIMARY KEY(id)
);


CREATE SEQUENCE public.measured_body_views_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.measured_body_views_id_seq OWNED BY public.measured_body_views.id;

SELECT pg_catalog.setval('public.measured_body_views_id_seq', 1, false);


-- measurement_views

CREATE TABLE public.measurement_views (
  id integer NOT NULL,
  name VARCHAR(50),
  index integer,
  measured_body_views_id integer,
  PRIMARY KEY(id),
  CONSTRAINT fk_measured_body_views
    FOREIGN KEY(measured_body_views_id) 
    REFERENCES public.measured_body_views(id)
);


CREATE SEQUENCE public.measurement_views_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.measurement_views_id_seq OWNED BY public.measurement_views.id;

SELECT pg_catalog.setval('public.measurement_views_id_seq', 1, false);


-- body_views table

CREATE TABLE public.body_views (
  id integer NOT NULL,
  position double precision[3],
  target double precision[3],
  zoom real,
  measurement_views_id integer,
  CONSTRAINT body_views_position_check CHECK (array_length(position, 1) = 3),
  CONSTRAINT body_views_target_check CHECK (array_length(target, 1) = 3),
  PRIMARY KEY(id),
  CONSTRAINT fk_measurement_views_id
    FOREIGN KEY(measurement_views_id) 
    REFERENCES public.measurement_views(id)
);

CREATE SEQUENCE public.body_views_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.body_views_id_seq OWNED BY public.body_views.id;

SELECT pg_catalog.setval('public.body_views_id_seq', 1, false);

ALTER TABLE ONLY public.body_views ALTER COLUMN id SET DEFAULT nextval('public.body_views_id_seq'::regclass);


--
-- Name: batches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches ALTER COLUMN id SET DEFAULT nextval('public.batches_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: computed_points id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.computed_points ALTER COLUMN id SET DEFAULT nextval('public.computed_points_id_seq'::regclass);



--
-- Name: curves id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.curves ALTER COLUMN id SET DEFAULT nextval('public.curves_id_seq'::regclass);


--
-- Name: labels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labels ALTER COLUMN id SET DEFAULT nextval('public.labels_id_seq'::regclass);


--
-- Name: landmarks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landmarks ALTER COLUMN id SET DEFAULT nextval('public.landmarks_id_seq'::regclass);



--
-- Name: measured_bodies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.measured_bodies ALTER COLUMN id SET DEFAULT nextval('public.measured_bodies_id_seq'::regclass);



--
-- Name: values id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."values" ALTER COLUMN id SET DEFAULT nextval('public.values_id_seq'::regclass);



--
-- Name: batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.batches_id_seq', 1, true);


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.comments_id_seq', 1, false);


--
-- Name: computed_points_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.computed_points_id_seq', 1, false);



--
-- Name: curves_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.curves_id_seq', 4, true);




--
-- Name: labels_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.labels_id_seq', 3, true);


--
-- Name: landmarks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.landmarks_id_seq', 9, true);



--
-- Name: measured_bodies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.measured_bodies_id_seq', 1, true);


--
-- Name: values_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.values_id_seq', 4, true);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: computed_points computed_points_name_body_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.computed_points
    ADD CONSTRAINT computed_points_name_body_key UNIQUE (name, body);


--
-- Name: computed_points computed_points_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.computed_points
    ADD CONSTRAINT computed_points_pkey PRIMARY KEY (id);



--
-- Name: curves curves_name_body_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.curves
    ADD CONSTRAINT curves_name_body_key UNIQUE (name, body);


--
-- Name: curves curves_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.curves
    ADD CONSTRAINT curves_pkey PRIMARY KEY (id);



--
-- Name: labels labels_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_name_key UNIQUE (name);


--
-- Name: labels labels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_pkey PRIMARY KEY (id);


--
-- Name: landmarks landmarks_landmark_name_landmark_set_name_body_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landmarks
    ADD CONSTRAINT landmarks_landmark_name_landmark_set_name_body_key UNIQUE (landmark_name, landmark_set_name, body);


--
-- Name: landmarks landmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landmarks
    ADD CONSTRAINT landmarks_pkey PRIMARY KEY (id);



--
-- Name: measured_bodies measured_bodies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.measured_bodies
    ADD CONSTRAINT measured_bodies_pkey PRIMARY KEY (id);



ALTER TABLE ONLY public.feedback_associations
    ADD CONSTRAINT feedback_associations_pkey PRIMARY KEY (id);

--
-- Name: values values_name_body_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."values"
    ADD CONSTRAINT values_name_body_key UNIQUE (name, body);


--
-- Name: values values_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."values"
    ADD CONSTRAINT values_pkey PRIMARY KEY (id);


--
-- Name: computed_points computed_points_body_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.computed_points
    ADD CONSTRAINT computed_points_body_fkey FOREIGN KEY (body) REFERENCES public.measured_bodies(id);




--
-- Name: curves curves_body_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.curves
    ADD CONSTRAINT curves_body_fkey FOREIGN KEY (body) REFERENCES public.measured_bodies(id);



--
-- Name: landmarks landmarks_body_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landmarks
    ADD CONSTRAINT landmarks_body_fkey FOREIGN KEY (body) REFERENCES public.measured_bodies(id);



--
-- Name: measured_bodies measured_bodies_batch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.measured_bodies
    ADD CONSTRAINT measured_bodies_batch_fkey FOREIGN KEY (batch) REFERENCES public.batches(id);


--
-- Name: values values_body_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."values"
    ADD CONSTRAINT values_body_fkey FOREIGN KEY (body) REFERENCES public.measured_bodies(id);


ALTER TABLE ONLY public.feedback_associations
    ADD CONSTRAINT feedback_associations_body_fkey FOREIGN KEY (body) REFERENCES public.measured_bodies(id);


ALTER TABLE ONLY public.feedback_associations
    ADD CONSTRAINT feedback_associations_landmark_fkey FOREIGN KEY (landmark) REFERENCES public.landmarks(id);


ALTER TABLE ONLY public.feedback_associations
    ADD CONSTRAINT feedback_associations_computed_point_fkey FOREIGN KEY (computed_point) REFERENCES public.computed_points(id);

ALTER TABLE ONLY public.feedback_associations
    ADD CONSTRAINT feedback_associations_curve_fkey FOREIGN KEY (curve) REFERENCES public.curves(id);

ALTER TABLE ONLY public.feedback_associations
    ADD CONSTRAINT feedback_associations_values_fkey FOREIGN KEY (value) REFERENCES public."values"(id);

ALTER TABLE ONLY public.feedback_associations
    ADD CONSTRAINT feedback_associations_comments_fkey FOREIGN KEY (comment) REFERENCES public.comments(id);

ALTER TABLE ONLY public.feedback_associations
    ADD CONSTRAINT feedback_associations_labels_fkey FOREIGN KEY (label) REFERENCES public.labels(id);

--
-- Name: postgraphile_watch_ddl; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER postgraphile_watch_ddl ON ddl_command_end
         WHEN TAG IN ('ALTER AGGREGATE', 'ALTER DOMAIN', 'ALTER EXTENSION', 'ALTER FOREIGN TABLE', 'ALTER FUNCTION', 'ALTER POLICY', 'ALTER SCHEMA', 'ALTER TABLE', 'ALTER TYPE', 'ALTER VIEW', 'COMMENT', 'CREATE AGGREGATE', 'CREATE DOMAIN', 'CREATE EXTENSION', 'CREATE FOREIGN TABLE', 'CREATE FUNCTION', 'CREATE INDEX', 'CREATE POLICY', 'CREATE RULE', 'CREATE SCHEMA', 'CREATE TABLE', 'CREATE TABLE AS', 'CREATE VIEW', 'DROP AGGREGATE', 'DROP DOMAIN', 'DROP EXTENSION', 'DROP FOREIGN TABLE', 'DROP FUNCTION', 'DROP INDEX', 'DROP OWNED', 'DROP POLICY', 'DROP RULE', 'DROP SCHEMA', 'DROP TABLE', 'DROP TYPE', 'DROP VIEW', 'GRANT', 'REVOKE', 'SELECT INTO')
   EXECUTE PROCEDURE postgraphile_watch.notify_watchers_ddl();


ALTER EVENT TRIGGER postgraphile_watch_ddl OWNER TO postgres;

--
-- Name: postgraphile_watch_drop; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER postgraphile_watch_drop ON sql_drop
   EXECUTE PROCEDURE postgraphile_watch.notify_watchers_drop();


ALTER EVENT TRIGGER postgraphile_watch_drop OWNER TO postgres;

--
-- PostgreSQL database dump complete
--

