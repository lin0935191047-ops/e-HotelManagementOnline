--
-- PostgreSQL database dump
--

\restrict Rtwdm6zF9yGCXvabMA5e85HxKaNXa1Pr3xDanH4uGCfR2svR1FUxMCfGb4nhpZy

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: BookingStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BookingStatus" AS ENUM (
    'CONFIRMED',
    'CANCELLED',
    'CHECKED_IN',
    'CHECKED_OUT'
);


ALTER TYPE public."BookingStatus" OWNER TO postgres;

--
-- Name: CardType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CardType" AS ENUM (
    'ATM',
    'VISA'
);


ALTER TYPE public."CardType" OWNER TO postgres;

--
-- Name: DiscountType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DiscountType" AS ENUM (
    'PERCENTAGE',
    'FIXED_AMOUNT'
);


ALTER TYPE public."DiscountType" OWNER TO postgres;

--
-- Name: GuestType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."GuestType" AS ENUM (
    'ADULT',
    'CHILD'
);


ALTER TYPE public."GuestType" OWNER TO postgres;

--
-- Name: PaymentOption; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentOption" AS ENUM (
    'FULL_100',
    'DEPOSIT_50'
);


ALTER TYPE public."PaymentOption" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'MANAGER',
    'SALE'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: RoomSize; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RoomSize" AS ENUM (
    'SINGLE',
    'DOUBLE'
);


ALTER TYPE public."RoomSize" OWNER TO postgres;

--
-- Name: RoomStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RoomStatus" AS ENUM (
    'AVAILABLE',
    'OCCUPIED',
    'MAINTENANCE'
);


ALTER TYPE public."RoomStatus" OWNER TO postgres;

--
-- Name: RoomType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RoomType" AS ENUM (
    'VIP',
    'DELUX',
    'LIVING_SUITE'
);


ALTER TYPE public."RoomType" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: booking_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.booking_items (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    room_type public."RoomType" NOT NULL,
    room_size public."RoomSize" NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    CONSTRAINT booking_items_quantity_check CHECK ((quantity >= 1)),
    CONSTRAINT booking_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.booking_items OWNER TO postgres;

--
-- Name: booking_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.booking_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.booking_items_id_seq OWNER TO postgres;

--
-- Name: booking_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.booking_items_id_seq OWNED BY public.booking_items.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    booking_number text NOT NULL,
    customer_name text NOT NULL,
    customer_phone text NOT NULL,
    customer_email text NOT NULL,
    customer_cccd text NOT NULL,
    from_date timestamp(3) without time zone NOT NULL,
    to_date timestamp(3) without time zone NOT NULL,
    promotion_id text,
    total_room_fee numeric(12,2) NOT NULL,
    discount_amount numeric(12,2) DEFAULT 0 NOT NULL,
    net_room_fee numeric(12,2) NOT NULL,
    payment_option public."PaymentOption" NOT NULL,
    prepaid_booking_value numeric(12,2) NOT NULL,
    payment_account_number text NOT NULL,
    cancellation_fee numeric(12,2),
    refund_amount numeric(12,2),
    extra_children_fee numeric(12,2) DEFAULT 0 NOT NULL,
    status public."BookingStatus" DEFAULT 'CONFIRMED'::public."BookingStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cancelled_at timestamp(3) without time zone,
    checked_out_at timestamp(3) without time zone,
    CONSTRAINT bookings_date_check CHECK ((to_date > from_date)),
    CONSTRAINT bookings_discount_amount_check CHECK ((discount_amount >= (0)::numeric)),
    CONSTRAINT bookings_extra_children_fee_check CHECK ((extra_children_fee >= (0)::numeric)),
    CONSTRAINT bookings_net_room_fee_check CHECK ((net_room_fee >= (0)::numeric)),
    CONSTRAINT bookings_prepaid_booking_value_check CHECK ((prepaid_booking_value >= (0)::numeric)),
    CONSTRAINT bookings_total_room_fee_check CHECK ((total_room_fee >= (0)::numeric))
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bookings_id_seq OWNER TO postgres;

--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    invoice_id text NOT NULL,
    booking_id integer NOT NULL,
    total_room_fee numeric(12,2) NOT NULL,
    extra_children_fee numeric(12,2) DEFAULT 0 NOT NULL,
    total_service_fee numeric(12,2) DEFAULT 0 NOT NULL,
    total_invoice_amount numeric(12,2) NOT NULL,
    prepaid_booking_value numeric(12,2) NOT NULL,
    remaining_payable numeric(12,2) NOT NULL,
    issued_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: payment_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_accounts (
    id integer NOT NULL,
    card_type public."CardType" NOT NULL,
    account_number text NOT NULL,
    account_holder text NOT NULL,
    balance numeric(15,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT payment_accounts_balance_check CHECK ((balance >= (0)::numeric))
);


ALTER TABLE public.payment_accounts OWNER TO postgres;

--
-- Name: payment_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_accounts_id_seq OWNER TO postgres;

--
-- Name: payment_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_accounts_id_seq OWNED BY public.payment_accounts.id;


--
-- Name: promotions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promotions (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    discount_type public."DiscountType" NOT NULL,
    value numeric(12,2) NOT NULL,
    start_date timestamp(3) without time zone NOT NULL,
    end_date timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT promotions_date_check CHECK ((end_date >= start_date)),
    CONSTRAINT promotions_value_check CHECK ((value > (0)::numeric))
);


ALTER TABLE public.promotions OWNER TO postgres;

--
-- Name: room_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.room_assignments (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    room_id text NOT NULL,
    check_in_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    check_out_at timestamp(3) without time zone
);


ALTER TABLE public.room_assignments OWNER TO postgres;

--
-- Name: room_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.room_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.room_assignments_id_seq OWNER TO postgres;

--
-- Name: room_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.room_assignments_id_seq OWNED BY public.room_assignments.id;


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rooms (
    room_id text NOT NULL,
    type public."RoomType" NOT NULL,
    size public."RoomSize" NOT NULL,
    price numeric(12,2) NOT NULL,
    max_adults integer NOT NULL,
    max_children integer NOT NULL,
    extra_child_fee numeric(12,2) NOT NULL,
    description text,
    pictures text[] DEFAULT ARRAY[]::text[],
    status public."RoomStatus" DEFAULT 'AVAILABLE'::public."RoomStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT rooms_extra_child_fee_check CHECK ((extra_child_fee >= (0)::numeric)),
    CONSTRAINT rooms_max_adults_check CHECK ((max_adults >= 1)),
    CONSTRAINT rooms_max_children_check CHECK ((max_children >= 0)),
    CONSTRAINT rooms_price_check CHECK ((price >= (0)::numeric))
);


ALTER TABLE public.rooms OWNER TO postgres;

--
-- Name: service_usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_usage (
    ticket_id text NOT NULL,
    booking_id integer NOT NULL,
    room_id text NOT NULL,
    service_id text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT service_usage_quantity_check CHECK ((quantity >= 1)),
    CONSTRAINT service_usage_total_price_check CHECK ((total_price >= (0)::numeric)),
    CONSTRAINT service_usage_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.service_usage OWNER TO postgres;

--
-- Name: services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.services (
    service_id text NOT NULL,
    service_name text NOT NULL,
    description text,
    unit text NOT NULL,
    price numeric(12,2) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT services_price_check CHECK ((price > (0)::numeric))
);


ALTER TABLE public.services OWNER TO postgres;

--
-- Name: staying_guests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staying_guests (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    room_assignment_id integer NOT NULL,
    full_name text NOT NULL,
    id_number text NOT NULL,
    birth_year integer NOT NULL,
    guest_type public."GuestType" NOT NULL,
    CONSTRAINT staying_guests_birth_year_check CHECK ((birth_year >= 1900))
);


ALTER TABLE public.staying_guests OWNER TO postgres;

--
-- Name: staying_guests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.staying_guests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staying_guests_id_seq OWNER TO postgres;

--
-- Name: staying_guests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.staying_guests_id_seq OWNED BY public.staying_guests.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    role public."Role" NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_active_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: booking_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_items ALTER COLUMN id SET DEFAULT nextval('public.booking_items_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: payment_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_accounts ALTER COLUMN id SET DEFAULT nextval('public.payment_accounts_id_seq'::regclass);


--
-- Name: room_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_assignments ALTER COLUMN id SET DEFAULT nextval('public.room_assignments_id_seq'::regclass);


--
-- Name: staying_guests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staying_guests ALTER COLUMN id SET DEFAULT nextval('public.staying_guests_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: booking_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.booking_items (id, booking_id, room_type, room_size, quantity, unit_price) FROM stdin;
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (id, booking_number, customer_name, customer_phone, customer_email, customer_cccd, from_date, to_date, promotion_id, total_room_fee, discount_amount, net_room_fee, payment_option, prepaid_booking_value, payment_account_number, cancellation_fee, refund_amount, extra_children_fee, status, created_at, cancelled_at, checked_out_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (invoice_id, booking_id, total_room_fee, extra_children_fee, total_service_fee, total_invoice_amount, prepaid_booking_value, remaining_payable, issued_at) FROM stdin;
\.


--
-- Data for Name: payment_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_accounts (id, card_type, account_number, account_holder, balance, created_at) FROM stdin;
1	ATM	97040001	NGUYEN VAN A	50000000.00	2026-10-21 09:29:00.434
2	VISA	4000123456789010	TRAN THI B	100000000.00	2026-10-21 09:29:00.434
\.


--
-- Data for Name: promotions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promotions (id, code, name, description, discount_type, value, start_date, end_date, created_at) FROM stdin;
promo-01	CHAOHET2026	Ưu đãi chào năm 2026	Giảm 10% tổng giá trị phòng	PERCENTAGE	10.00	2026-10-21 09:29:00.444	2026-11-20 09:29:00.444	2026-10-21 09:29:00.444
promo-02	SUMMER500K	Gói nghỉ dưỡng gia đình	Giảm trực tiếp 500.000 VNĐ cho đơn đặt phòng	FIXED_AMOUNT	500000.00	2026-10-21 09:29:00.444	2026-11-20 09:29:00.444	2026-10-21 09:29:00.444
\.


--
-- Data for Name: room_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.room_assignments (id, booking_id, room_id, check_in_at, check_out_at) FROM stdin;
\.


--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rooms (room_id, type, size, price, max_adults, max_children, extra_child_fee, description, pictures, status, created_at) FROM stdin;
101	VIP	DOUBLE	1200000.00	2	2	150000.00	Phòng VIP Đôi hướng biển, đầy đủ tiện nghi cao cấp	{https://images.unsplash.com/photo-1582719478250-c89cae4dc85b,https://images.unsplash.com/photo-1591088398332-8a7791972843}	AVAILABLE	2026-10-21 09:29:00.438
102	VIP	SINGLE	800000.00	1	1	150000.00	Phòng VIP Đơn yên tĩnh, trang nhã cho doanh nhân	{https://images.unsplash.com/photo-1618773928121-c32242e63f39}	AVAILABLE	2026-10-21 09:29:00.438
201	DELUX	DOUBLE	1500000.00	2	2	200000.00	Phòng Deluxe Đôi ban công rộng ngắm toàn cảnh	{https://images.unsplash.com/photo-1590490360182-c33d57733427}	AVAILABLE	2026-10-21 09:29:00.438
202	DELUX	SINGLE	1000000.00	1	1	200000.00	Phòng Deluxe Đơn ấm cúng, thiết kế hiện đại	{https://images.unsplash.com/photo-1566665797739-1674de7a421a}	AVAILABLE	2026-10-21 09:29:00.438
301	LIVING_SUITE	DOUBLE	2500000.00	4	2	300000.00	Phòng Suite Tổng thống có phòng khách, quầy bar riêng biệt	{https://images.unsplash.com/photo-1578683010236-d716f9a3f461}	AVAILABLE	2026-10-21 09:29:00.438
\.


--
-- Data for Name: service_usage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_usage (ticket_id, booking_id, room_id, service_id, quantity, unit_price, total_price, created_at) FROM stdin;
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.services (service_id, service_name, description, unit, price, created_at) FROM stdin;
SRV-01	Giặt ủi nhanh	Giặt và là khô lấy ngay trong ngày	Kg	30000.00	2026-10-21 09:29:00.441
SRV-02	Bữa sáng Buffet Quốc tế	Thực đơn Á - Âu trên 50 món tự chọn	Suất	150000.00	2026-10-21 09:29:00.441
SRV-03	Massage Spa trị liệu toàn thân	Liệu trình thư giãn thảo dược 60 phút	Lượt	350000.00	2026-10-21 09:29:00.441
SRV-04	Đưa đón sân bay 4 chỗ	Xe riêng đón tại sân bay về khách sạn	Chuyến	250000.00	2026-10-21 09:29:00.441
\.


--
-- Data for Name: staying_guests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.staying_guests (id, booking_id, room_assignment_id, full_name, id_number, birth_year, guest_type) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, full_name, role, is_active, last_active_at, created_at) FROM stdin;
1	admin	$2a$10$ezYBHyX.CThQUg9eLxFgaerWPhJJ0us7e80BwL9CK8u9/L2eM5IaG	Quản trị viên Hệ thống	ADMIN	t	2026-10-21 09:29:00.431	2026-10-21 09:29:00.431
2	manager	$2a$10$mohWuRe49ojJDQIJslCGY.k0Nyh3vHBdG/u7aow/SyyO9RuFE9UEe	Trưởng phòng Quản lý Setup	MANAGER	t	2026-10-21 09:29:00.431	2026-10-21 09:29:00.431
3	sale	$2a$10$5RGMyzqwtXwbz0bVWDXyb.REeMURohUq4ajcJ8SLhrfVcLFL28Fli	Nhân viên Lễ tân & Bán phòng	SALE	t	2026-10-21 09:29:00.431	2026-10-21 09:29:00.431
\.


--
-- Name: booking_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.booking_items_id_seq', 1, false);


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bookings_id_seq', 1, false);


--
-- Name: payment_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_accounts_id_seq', 2, true);


--
-- Name: room_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.room_assignments_id_seq', 1, false);


--
-- Name: staying_guests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.staying_guests_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: booking_items booking_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_items
    ADD CONSTRAINT booking_items_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_booking_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_booking_number_key UNIQUE (booking_number);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_booking_id_key UNIQUE (booking_id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (invoice_id);


--
-- Name: payment_accounts payment_accounts_account_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_accounts
    ADD CONSTRAINT payment_accounts_account_number_key UNIQUE (account_number);


--
-- Name: payment_accounts payment_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_accounts
    ADD CONSTRAINT payment_accounts_pkey PRIMARY KEY (id);


--
-- Name: promotions promotions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_code_key UNIQUE (code);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- Name: room_assignments room_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_assignments
    ADD CONSTRAINT room_assignments_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (room_id);


--
-- Name: service_usage service_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_usage
    ADD CONSTRAINT service_usage_pkey PRIMARY KEY (ticket_id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (service_id);


--
-- Name: staying_guests staying_guests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staying_guests
    ADD CONSTRAINT staying_guests_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: booking_items booking_items_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_items
    ADD CONSTRAINT booking_items_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bookings bookings_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: room_assignments room_assignments_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_assignments
    ADD CONSTRAINT room_assignments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: room_assignments room_assignments_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_assignments
    ADD CONSTRAINT room_assignments_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(room_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: service_usage service_usage_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_usage
    ADD CONSTRAINT service_usage_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: service_usage service_usage_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_usage
    ADD CONSTRAINT service_usage_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(service_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: staying_guests staying_guests_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staying_guests
    ADD CONSTRAINT staying_guests_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: staying_guests staying_guests_room_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staying_guests
    ADD CONSTRAINT staying_guests_room_assignment_id_fkey FOREIGN KEY (room_assignment_id) REFERENCES public.room_assignments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Rtwdm6zF9yGCXvabMA5e85HxKaNXa1Pr3xDanH4uGCfR2svR1FUxMCfGb4nhpZy

