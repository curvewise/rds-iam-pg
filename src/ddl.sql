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
    CONSTRAINT batches_reference_frame_up_check CHECK ((array_length(reference_frame_up, 1) = 3)),
    PRIMARY KEY(id)
);


ALTER TABLE public.batches OWNER TO postgres;
CREATE SEQUENCE public.batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE public.batches_id_seq OWNER TO postgres;
ALTER SEQUENCE public.batches_id_seq OWNED BY public.batches.id;
SELECT pg_catalog.setval('public.batches_id_seq', 1, true);
ALTER TABLE ONLY public.batches ALTER COLUMN id SET DEFAULT nextval('public.batches_id_seq'::regclass);

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
    batch_id integer NOT NULL,
    PRIMARY KEY(id),
    CONSTRAINT measured_bodies_batch_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id)
);


ALTER TABLE public.measured_bodies OWNER TO postgres;
CREATE SEQUENCE public.measured_bodies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE ONLY public.measured_bodies ALTER COLUMN id SET DEFAULT nextval('public.measured_bodies_id_seq'::regclass);
ALTER TABLE public.measured_bodies_id_seq OWNER TO postgres;
ALTER SEQUENCE public.measured_bodies_id_seq OWNED BY public.measured_bodies.id;
SELECT pg_catalog.setval('public.measured_bodies_id_seq', 1, true);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    content text,
    PRIMARY KEY(id)
);


ALTER TABLE public.comments OWNER TO postgres;
CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE public.comments_id_seq OWNER TO postgres;
SELECT pg_catalog.setval('public.comments_id_seq', 1, false);
ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);
ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: computed_points; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.computed_points (
    vertex double precision[],
    id integer NOT NULL,
    name character varying(50),
    body_id integer NOT NULL,
    CONSTRAINT computed_points_vertex_check CHECK ((array_length(vertex, 1) = 3)),
    PRIMARY KEY(id),
    CONSTRAINT computed_points_body_fkey FOREIGN KEY (body_id) REFERENCES public.measured_bodies(id),
    CONSTRAINT computed_points_name_body_key UNIQUE (name, body_id)
);


CREATE SEQUENCE public.computed_points_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.computed_points OWNER TO postgres;
ALTER TABLE public.computed_points_id_seq OWNER TO postgres;
ALTER SEQUENCE public.computed_points_id_seq OWNED BY public.computed_points.id;
SELECT pg_catalog.setval('public.computed_points_id_seq', 1, false);
ALTER TABLE ONLY public.computed_points ALTER COLUMN id SET DEFAULT nextval('public.computed_points_id_seq'::regclass);




--
-- Name: curves; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.curves (
    id integer NOT NULL,
    name character varying(50),
    is_closed boolean,
    vertices double precision[],
    body_id integer NOT NULL,
    PRIMARY KEY(id),
    CONSTRAINT curves_vertices_check CHECK ((array_length(vertices, 2) = 3)),
    CONSTRAINT curves_body_fkey FOREIGN KEY (body_id) REFERENCES public.measured_bodies(id),
    CONSTRAINT curves_name_body_key UNIQUE (name, body_id)
);


ALTER TABLE public.curves OWNER TO postgres;
CREATE SEQUENCE public.curves_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE ONLY public.curves ALTER COLUMN id SET DEFAULT nextval('public.curves_id_seq'::regclass);
ALTER TABLE public.curves_id_seq OWNER TO postgres;
ALTER SEQUENCE public.curves_id_seq OWNED BY public.curves.id;
SELECT pg_catalog.setval('public.curves_id_seq', 4, true);


--
-- Name: labels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.labels (
    id integer NOT NULL,
    name character varying(50),
    PRIMARY KEY(id),
    CONSTRAINT labels_name_key UNIQUE (name)
);


ALTER TABLE public.labels OWNER TO postgres;
CREATE SEQUENCE public.labels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE ONLY public.labels ALTER COLUMN id SET DEFAULT nextval('public.labels_id_seq'::regclass);
ALTER TABLE public.labels_id_seq OWNER TO postgres;
ALTER SEQUENCE public.labels_id_seq OWNED BY public.labels.id;
SELECT pg_catalog.setval('public.labels_id_seq', 3, true);

--
-- Name: landmarks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.landmarks (
    vertex double precision[],
    id integer NOT NULL,
    landmark_name character varying(50),
    landmark_set_name character varying(50),
    body_id integer NOT NULL,
    CONSTRAINT landmarks_vertex_check CHECK ((array_length(vertex, 1) = 3)),
    PRIMARY KEY(id),
    CONSTRAINT landmarks_body_fkey FOREIGN KEY (body_id) REFERENCES public.measured_bodies(id),
    CONSTRAINT landmarks_landmark_name_landmark_set_name_body_key UNIQUE (landmark_name, landmark_set_name, body_id)
);


ALTER TABLE public.landmarks OWNER TO postgres;
CREATE SEQUENCE public.landmarks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE ONLY public.landmarks ALTER COLUMN id SET DEFAULT nextval('public.landmarks_id_seq'::regclass);
ALTER TABLE public.landmarks_id_seq OWNER TO postgres;
ALTER SEQUENCE public.landmarks_id_seq OWNED BY public.landmarks.id;
SELECT pg_catalog.setval('public.landmarks_id_seq', 9, true);




--
-- Name: values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."values" (
    id integer NOT NULL,
    name character varying(50),
    value double precision,
    units character varying(2),
    body_id integer NOT NULL,
    PRIMARY KEY(id),
    CONSTRAINT values_body_fkey FOREIGN KEY (body_id) REFERENCES public.measured_bodies(id),
    CONSTRAINT values_name_body_key UNIQUE (name, body_id)
);


ALTER TABLE public."values" OWNER TO postgres;
CREATE SEQUENCE public.values_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE ONLY public."values" ALTER COLUMN id SET DEFAULT nextval('public.values_id_seq'::regclass);
ALTER TABLE public.values_id_seq OWNER TO postgres;
ALTER SEQUENCE public.values_id_seq OWNED BY public."values".id;
SELECT pg_catalog.setval('public.values_id_seq', 4, true);



--feedback_assocations table


CREATE TABLE public.feedback_associations (
    id integer NOT NULL,
    body_id integer,
    landmark_id integer,
    computed_point_id integer,
    value_id integer,
    curve_id integer,
    comment_id integer,
    label_id integer,
    PRIMARY KEY(id),
    CONSTRAINT feedback_associations_body_fkey FOREIGN KEY (body_id) REFERENCES public.measured_bodies(id),
    CONSTRAINT feedback_associations_landmark_fkey FOREIGN KEY (landmark_id) REFERENCES public.landmarks(id),
    CONSTRAINT feedback_associations_computed_point_fkey FOREIGN KEY (computed_point_id) REFERENCES public.computed_points(id),
    CONSTRAINT feedback_associations_curve_fkey FOREIGN KEY (curve_id) REFERENCES public.curves(id),
    CONSTRAINT feedback_associations_values_fkey FOREIGN KEY (value_id) REFERENCES public."values"(id),
    CONSTRAINT feedback_associations_comments_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id),
    CONSTRAINT feedback_associations_labels_fkey FOREIGN KEY (label_id) REFERENCES public.labels(id)
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


