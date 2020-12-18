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

CREATE TABLE public.pose_types (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE public.datasets (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    units public.units_type NOT NULL,
    topology public.topology_type,
    body_part public.body_part_type NOT NULL,
    superior_direction public.axis_type,
    anterior_direction public.axis_type,
    CONSTRAINT axes_null_together CHECK ((superior_direction IS NULL AND anterior_direction IS NULL) OR (superior_direction IS NOT NULL AND anterior_direction IS NOT NULL)),
    CONSTRAINT axes_orthogonal CHECK (superior_direction != anterior_direction OR superior_direction IS NULL),
    CONSTRAINT axes_required CHECK (
    CASE WHEN body_part = 'body' THEN
    (superior_direction IS NOT NULL AND anterior_direction IS NOT NULL)
ELSE
    TRUE
    END),
    PRIMARY KEY (id)
);

CREATE SEQUENCE public.datasets_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.datasets_id_seq OWNED BY public.datasets.id;

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
    CONSTRAINT subjects_dataset_fkey FOREIGN KEY (dataset_id) REFERENCES public.datasets (id),
    CONSTRAINT name_is_unique UNIQUE (dataset_id, name)
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

-- Pose
CREATE TABLE public.poses (
    id integer NOT NULL,
    pose_type_id integer NOT NULL,
    subject_id integer NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT poses_subjects_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects (id),
    CONSTRAINT poses_pose_type_fkey FOREIGN KEY (pose_type_id) REFERENCES public.pose_types (id),
    CONSTRAINT pose_type_is_unique UNIQUE (pose_type_id, subject_id)
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

--
-- geometries
--
CREATE TABLE public.geometries (
    id integer NOT NULL,
    s3_key character varying(128) NOT NULL,
    version integer NOT NULL,
    pose_id integer NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT geometries_poses_fkey FOREIGN KEY (pose_id) REFERENCES public.poses (id),
    CONSTRAINT geometries_unique_pose_version UNIQUE (pose_id, version)
);

CREATE FUNCTION public.dataset_id_for_geometry_id (geometry_id integer)
    RETURNS integer
    AS $$
    SELECT
        d.id
    from
        public.datasets d
        inner join public.subjects s on s.dataset_id = d.id
        inner join public.poses p on p.subject_id = s.id
        inner join public.geometries g on g.pose_id = p.id
    where
        geometry_id = g.id
$$
LANGUAGE sql
STABLE;

CREATE FUNCTION public.geometries_dataset_id (geometry public.geometries)
    RETURNS integer
    AS $$
    select
        public.dataset_id_for_geometry_id (geometry.id)
$$
LANGUAGE sql
STABLE;

CREATE SEQUENCE public.geometries_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.geometries
    ALTER COLUMN id SET DEFAULT nextval('public.geometries_id_seq'::regclass);

ALTER SEQUENCE public.geometries_id_seq OWNED BY public.geometries.id;

--
-- jobs
--
CREATE TABLE public.jobs (
    id integer NOT NULL,
    name character varying(50),
    PRIMARY KEY (id)
    --TODO: status enum
);

CREATE FUNCTION public.jobs_dataset_id (job public.jobs)
    RETURNS integer
    AS $$
    SELECT
        d.id
    from
        public.datasets d
        inner join public.subjects s on s.dataset_id = d.id
        inner join public.poses p on p.subject_id = s.id
        inner join public.geometries g on g.pose_id = p.id
        inner join public.job_results jr on jr.geometry_id = g.id
        inner join public.jobs j on jr.job_id = j.id
    where
        j.id = job.id;

$$
LANGUAGE sql
STABLE;

CREATE SEQUENCE public.jobs_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.jobs
    ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;

--
-- job_results
--
CREATE TABLE public.job_results (
    id integer NOT NULL,
    job_id integer NOT NULL,
    geometry_id integer NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs (id),
    CONSTRAINT geometry_id_fkey FOREIGN KEY (geometry_id) REFERENCES public.geometries (id)
);

CREATE FUNCTION public.job_results_dataset_id (job_result public.job_results)
    RETURNS integer
    AS $$
    SELECT
        d.id
    from
        public.datasets d
        inner join public.subjects s on s.dataset_id = d.id
        inner join public.poses p on p.subject_id = s.id
        inner join public.geometries g on g.pose_id = p.id
        inner join public.job_results jr on jr.geometry_id = g.id
    where
        jr.id = job_result.id;

$$
LANGUAGE sql
STABLE;

CREATE FUNCTION public.validate_job_result ()
    returns trigger
    as $$
DECLARE
    geometries_from_different_dataset_count int;
    DECLARE new_record_dataset_id int;
    DECLARE existing_dataset_id int;
BEGIN
    new_record_dataset_id := public.dataset_id_for_geometry_id (NEW.geometry_id);
    geometries_from_different_dataset_count := (
        SELECT
            COUNT(*)
        FROM
            public.job_results jr
            inner join public.geometries g on jr.geometry_id = g.id
        where
            jr.job_id = NEW.job_id
            and public.geometries_dataset_id (g) != new_record_dataset_id);
    IF (geometries_from_different_dataset_count != 0) THEN
        existing_dataset_id := (
            SELECT
                public.geometries_dataset_id (g)
            FROM
                public.job_results jr
                inner join public.geometries g on jr.geometry_id = g.id
            where
                jr.job_id = NEW.job_id
            limit 1);
        RAISE EXCEPTION 'You attempted to insert a geometry for job % that is associated with dataset %, but this job is already associated with dataset %.', NEW.job_id, new_record_dataset_id, existing_dataset_id;
    END IF;
    RETURN NEW;
END;
$$
language plpgsql;

CREATE TRIGGER validate_job_result_trigger
    BEFORE INSERT OR UPDATE ON public.job_results
    FOR EACH ROW
    EXECUTE PROCEDURE public.validate_job_result ();

CREATE SEQUENCE public.job_results_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.jobs
    ALTER COLUMN id SET DEFAULT nextval('public.job_results_id_seq'::regclass);

ALTER SEQUENCE public.job_results_id_seq OWNED BY public.jobs.id;

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
    job_result_id integer NOT NULL,
    CONSTRAINT computed_points_vertex_check CHECK ((array_length(vertex, 1) = 3)),
    PRIMARY KEY (id),
    CONSTRAINT computed_points_job_result_fkey FOREIGN KEY (job_result_id) REFERENCES public.job_results (id),
    CONSTRAINT computed_points_name_body_key UNIQUE (name, job_result_id)
);

CREATE SEQUENCE public.computed_points_id_seq
    AS integer START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.computed_points_id_seq OWNED BY public.computed_points.id;

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
    job_result_id integer NOT NULL,
    tape_width double precision,
    PRIMARY KEY (id),
    CONSTRAINT curves_vertices_check CHECK ((array_length(vertices, 2) = 3)),
    CONSTRAINT curves_job_results_fkey FOREIGN KEY (job_result_id) REFERENCES public.job_results (id),
    CONSTRAINT curves_name_job_results_key UNIQUE (name, job_result_id)
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

--
-- Landmarks
--
CREATE TABLE public.landmarks (
    vertex double precision[],
    id integer NOT NULL,
    landmark_name character varying(50),
    landmark_set_name character varying(50),
    job_result_id integer NOT NULL,
    CONSTRAINT landmarks_vertex_check CHECK ((array_length(vertex, 1) = 3)),
    PRIMARY KEY (id),
    CONSTRAINT landmarks_job_results_fkey FOREIGN KEY (job_result_id) REFERENCES public.job_results (id),
    CONSTRAINT landmarks_landmark_name_landmark_set_name_body_key UNIQUE (landmark_name, landmark_set_name, job_result_id)
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

--
-- Values
--
CREATE TABLE public. "values" (
    id integer NOT NULL,
    name character varying(50),
    value double precision,
    units character varying(2),
    job_result_id integer NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT values_job_results_fkey FOREIGN KEY (job_result_id) REFERENCES public.job_results (id),
    CONSTRAINT values_name_job_results_key UNIQUE (name, job_result_id)
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

--
-- Feedback
--
CREATE TABLE public.feedback_associations (
    id integer NOT NULL,
    subject_id integer,
    pose_id integer,
    geometry_id integer,
    landmark_id integer,
    computed_point_id integer,
    value_id integer,
    curve_id integer,
    comment_id integer,
    label_id integer,
    PRIMARY KEY (id),
    CONSTRAINT feedback_associations_subject_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects (id),
    CONSTRAINT feedback_associations_pose_fkey FOREIGN KEY (pose_id) REFERENCES public.poses (id),
    CONSTRAINT feedback_associations_geometry_fkey FOREIGN KEY (geometry_id) REFERENCES public.geometries (id),
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

ALTER TABLE ONLY public.measured_body_views
    ALTER COLUMN id SET DEFAULT nextval('public.measured_body_views_id_seq'::regclass);

--
-- Measuremnt views
--
CREATE TABLE public.measurement_views (
    id integer NOT NULL,
    name varchar(50),
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

ALTER TABLE ONLY public.measurement_views
    ALTER COLUMN id SET DEFAULT nextval('public.measurement_views_id_seq'::regclass);

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

ALTER TABLE ONLY public.body_views
    ALTER COLUMN id SET DEFAULT nextval('public.body_views_id_seq'::regclass);

--
-- Imported files
--
CREATE TABLE public.checked_uploads (
    e_tag character varying(32) PRIMARY KEY,
    is_valid_obj boolean NOT NULL,
    predicted_body_units public.units_type,
    topology public.topology_type
);

