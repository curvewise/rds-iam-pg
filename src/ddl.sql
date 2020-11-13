SET statement_timeout = 0;

SET lock_timeout = 0;

SET idle_in_transaction_session_timeout = 0;

SET client_encoding = 'UTF8';

SET standard_conforming_strings = on;

SELECT
    pg_catalog.set_config('search_path', '', false);

SET check_function_bodies = false;

SET xmloption = content;

SET client_min_messages = warning;

SET row_security = off;

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Datasets
--

CREATE TYPE public.body_part_type AS ENUM (
    'body'
);

CREATE TYPE public.topology_type AS ENUM (
    'meshcapade_sm4'
);

CREATE TYPE public.units_type AS ENUM (
    'm',
    'cm',
    'mm',
    'in'
);

CREATE TYPE public.axis_type AS ENUM (
    'x',
    'y',
    'z',
    'neg_x',
    'neg_y',
    'neg_z'
);

CREATE TABLE public.datasets (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    units public.units_type NOT NULL,
    topology public.topology_type,
    body_part public.body_part_type NOT NULL,
    superior_direction public.axis_type,
    anterior_direction public.axis_type,
    PRIMARY KEY (id)
);

CREATE SEQUENCE public.datasets_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.datasets_id_seq OWNED BY public.datasets.id;

SELECT
    pg_catalog.setval('public.datasets_id_seq', 1, true);

ALTER TABLE ONLY public.datasets
    ALTER COLUMN id SET DEFAULT nextval('public.datasets_id_seq'::regclass);

--
-- Subjects
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    name character varying(50),
    gender character (1),
    dataset_id integer NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT subjects_dataset_fkey FOREIGN KEY (dataset_id) REFERENCES public.datasets (id)
);

CREATE SEQUENCE public.subjects_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.subjects
    ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;

SELECT
    pg_catalog.setval('public.subjects_id_seq', 1, true);

-- Pose
CREATE TABLE public.poses (
    id integer NOT NULL,
    name character varying(50),
    subject_id integer NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT poses_subjects_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects (id)
);

CREATE SEQUENCE public.poses_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.poses
    ALTER COLUMN id SET DEFAULT nextval('public.poses_id_seq'::regclass);

ALTER SEQUENCE public.poses_id_seq OWNED BY public.poses.id;

SELECT
    pg_catalog.setval('public.poses_id_seq', 1, true);

--
-- Measured geometries
--

CREATE TABLE public.measured_geometries (
    id integer NOT NULL,
    name character varying(50),
    s3_bucket character varying(50) NOT NULL,
    s3_path character varying(50) NOT NULL,
    version integer NOT NULL,
    pose_id integer NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT measured_geometries_poses_fkey FOREIGN KEY (pose_id) REFERENCES public.poses (id),
    CONSTRAINT measured_geometries_unique_pose_version UNIQUE (pose_id, version)
);

CREATE SEQUENCE public.measured_geometries_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.measured_geometries
    ALTER COLUMN id SET DEFAULT nextval('public.measured_geometries_id_seq'::regclass);

ALTER SEQUENCE public.measured_geometries_id_seq OWNED BY public.measured_geometries.id;

SELECT
    pg_catalog.setval('public.measured_geometries_id_seq', 1, true);

--
-- Comments
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    content text,
    PRIMARY KEY (id)
);

CREATE SEQUENCE public.comments_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

SELECT
    pg_catalog.setval('public.comments_id_seq', 1, false);

ALTER TABLE ONLY public.comments
    ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;

--
-- Computed points
--

CREATE TABLE public.computed_points (
    vertex double precision[],
    id integer NOT NULL,
    name character varying(50),
    measured_geometry_id integer NOT NULL,
    CONSTRAINT computed_points_vertex_check CHECK ((array_length(vertex, 1) = 3)),
    PRIMARY KEY (id),
    CONSTRAINT computed_points_body_fkey FOREIGN KEY (measured_geometry_id) REFERENCES public.measured_geometries (id),
    CONSTRAINT computed_points_name_body_key UNIQUE (name, measured_geometry_id)
);

CREATE SEQUENCE public.computed_points_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.computed_points_id_seq OWNED BY public.computed_points.id;

SELECT
    pg_catalog.setval('public.computed_points_id_seq', 1, false);

ALTER TABLE ONLY public.computed_points
    ALTER COLUMN id SET DEFAULT nextval('public.computed_points_id_seq'::regclass);

--
-- Curves
--

CREATE TABLE public.curves (
    id integer NOT NULL,
    name character varying(50),
    is_closed boolean,
    vertices double precision[],
    measured_geometry_id integer NOT NULL,
    tape_width double precision,
    PRIMARY KEY (id),
    CONSTRAINT curves_vertices_check CHECK ((array_length(vertices, 2) = 3)),
    CONSTRAINT curves_body_fkey FOREIGN KEY (measured_geometry_id) REFERENCES public.measured_geometries (id),
    CONSTRAINT curves_name_body_key UNIQUE (name, measured_geometry_id)
);

CREATE SEQUENCE public.curves_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.curves
    ALTER COLUMN id SET DEFAULT nextval('public.curves_id_seq'::regclass);

ALTER SEQUENCE public.curves_id_seq OWNED BY public.curves.id;

SELECT
    pg_catalog.setval('public.curves_id_seq', 4, true);

--
-- Labels
--

CREATE TABLE public.labels (
    id integer NOT NULL,
    name character varying(50),
    PRIMARY KEY (id),
    CONSTRAINT labels_name_key UNIQUE (name)
);

CREATE SEQUENCE public.labels_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.labels
    ALTER COLUMN id SET DEFAULT nextval('public.labels_id_seq'::regclass);

ALTER SEQUENCE public.labels_id_seq OWNED BY public.labels.id;

SELECT
    pg_catalog.setval('public.labels_id_seq', 3, true);

--
-- Landmarks
--

CREATE TABLE public.landmarks (
    vertex double precision[],
    id integer NOT NULL,
    landmark_name character varying(50),
    landmark_set_name character varying(50),
    measured_geometry_id integer NOT NULL,
    CONSTRAINT landmarks_vertex_check CHECK ((array_length(vertex, 1) = 3)),
    PRIMARY KEY (id),
    CONSTRAINT landmarks_body_fkey FOREIGN KEY (measured_geometry_id) REFERENCES public.measured_geometries (id),
    CONSTRAINT landmarks_landmark_name_landmark_set_name_body_key UNIQUE (landmark_name, landmark_set_name, measured_geometry_id)
);

CREATE SEQUENCE public.landmarks_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.landmarks
    ALTER COLUMN id SET DEFAULT nextval('public.landmarks_id_seq'::regclass);

ALTER SEQUENCE public.landmarks_id_seq OWNED BY public.landmarks.id;

SELECT
    pg_catalog.setval('public.landmarks_id_seq', 9, true);

--
-- Values
--

CREATE TABLE public. "values" (
    id integer NOT NULL,
    name character varying(50),
    value double precision,
    units character varying(2),
    measured_geometry_id integer NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT values_body_fkey FOREIGN KEY (measured_geometry_id) REFERENCES public.measured_geometries (id),
    CONSTRAINT values_name_body_key UNIQUE (name, measured_geometry_id)
);

CREATE SEQUENCE public.values_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public. "values"
    ALTER COLUMN id SET DEFAULT nextval('public.values_id_seq'::regclass);

ALTER SEQUENCE public.values_id_seq OWNED BY public. "values".id;

SELECT
    pg_catalog.setval('public.values_id_seq', 4, true);

--
-- Feedback
--

CREATE TABLE public.feedback_associations (
    id integer NOT NULL,
    subject_id integer,
    pose_id integer,
    measured_geometry_id integer,
    landmark_id integer,
    computed_point_id integer,
    value_id integer,
    curve_id integer,
    comment_id integer,
    label_id integer,
    PRIMARY KEY (id),
    CONSTRAINT feedback_associations_subject_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects (id),
    CONSTRAINT feedback_associations_pose_fkey FOREIGN KEY (pose_id) REFERENCES public.poses (id),
    CONSTRAINT feedback_associations_measured_geometry_fkey FOREIGN KEY (measured_geometry_id) REFERENCES public.measured_geometries (id),
    CONSTRAINT feedback_associations_landmark_fkey FOREIGN KEY (landmark_id) REFERENCES public.landmarks (id),
    CONSTRAINT feedback_associations_computed_point_fkey FOREIGN KEY (computed_point_id) REFERENCES public.computed_points (id),
    CONSTRAINT feedback_associations_curve_fkey FOREIGN KEY (curve_id) REFERENCES public.curves (id),
    CONSTRAINT feedback_associations_values_fkey FOREIGN KEY (value_id) REFERENCES public. "values" (id),
    CONSTRAINT feedback_associations_comments_fkey FOREIGN KEY (comment_id) REFERENCES public.comments (id),
    CONSTRAINT feedback_associations_labels_fkey FOREIGN KEY (label_id) REFERENCES public.labels (id)
);

CREATE SEQUENCE public.feedback_associations_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.feedback_associations_id_seq OWNED BY public.feedback_associations.id;

ALTER TABLE ONLY public.feedback_associations
    ALTER COLUMN id SET DEFAULT nextval('public.feedback_associations_id_seq'::regclass);

SELECT
    pg_catalog.setval('public.feedback_associations_id_seq', 1, false);

--
-- Measured body views
--

CREATE TABLE public.measured_body_views (
    id integer NOT NULL,
    version integer,
    is_perspective boolean,
    PRIMARY KEY (id)
);

CREATE SEQUENCE public.measured_body_views_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.measured_body_views_id_seq OWNED BY public.measured_body_views.id;

SELECT
    pg_catalog.setval('public.measured_body_views_id_seq', 1, false);

--
-- Measuremnt views
--

CREATE TABLE public.measurement_views (
    id integer NOT NULL,
    name VARCHAR(50),
    index integer,
    measured_body_views_id integer,
    PRIMARY KEY (id),
    CONSTRAINT fk_measured_body_views FOREIGN KEY (measured_body_views_id) REFERENCES public.measured_body_views (id)
);

CREATE SEQUENCE public.measurement_views_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.measurement_views_id_seq OWNED BY public.measurement_views.id;

SELECT
    pg_catalog.setval('public.measurement_views_id_seq', 1, false);

--
-- Body views
--

CREATE TABLE public.body_views (
    id integer NOT NULL,
    position double precision[3],
    target double precision[3],
    zoom real,
    measurement_views_id integer,
    CONSTRAINT body_views_position_check CHECK (array_length(position, 1) = 3),
    CONSTRAINT body_views_target_check CHECK (array_length(target, 1) = 3),
    PRIMARY KEY (id),
    CONSTRAINT fk_measurement_views_id FOREIGN KEY (measurement_views_id) REFERENCES public.measurement_views (id)
);

CREATE SEQUENCE public.body_views_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.body_views_id_seq OWNED BY public.body_views.id;

SELECT
    pg_catalog.setval('public.body_views_id_seq', 1, false);

ALTER TABLE ONLY public.body_views
    ALTER COLUMN id SET DEFAULT nextval('public.body_views_id_seq'::regclass);

