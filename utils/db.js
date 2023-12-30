// const { Pool } = require('pg')
// require('dotenv').config()

// // Tạo pool
// const pool = new Pool({
//   user: process.env.POSTGRESQL_USER,
//   host: process.env.POSTGRESQL_HOST,
//   database: process.env.POSTGRESQL_DATABASE,
//   password: process.env.POSTGRESQL_PASSWORD,
//   port: process.env.POSTGRESQL_PORT,
//   ssl: true,
// })

// pool.query(`
//   CREATE TABLE IF NOT EXISTS users (
//     id serial4 NOT NULL,
//     email varchar(255) NULL,
//     "password" text NOT NULL,
//     is_verified bool NULL DEFAULT false,
//     created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
//     username varchar NULL,
//     CONSTRAINT users_pkey PRIMARY KEY (id)
//   );
// `)

// pool.query(`
//   CREATE TABLE IF NOT EXISTS profiles (
//     profile_id int4 NOT NULL GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE),
//     fullname varchar NULL COLLATE "en_US.utf8",
//     sdt varchar NULL,
//     address varchar NULL COLLATE "en_US.utf8",
//     country varchar NOT NULL DEFAULT (+ 84),
//     users_id serial4 NOT NULL,
//     created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
//     avatar varchar NULL DEFAULT 'https://res.cloudinary.com/dopzctbyo/image/upload/v1701438598/minecraft/image-removebg-preview_dkmgak.png'::character varying,
//     balance int8 NOT NULL DEFAULT 0,
//     CONSTRAINT profiles_pk PRIMARY KEY (profile_id),
//     CONSTRAINT profiles_fk FOREIGN KEY (users_id) REFERENCES public.users(id)
//   )
// `)

// pool.query(`
//   CREATE TABLE IF NOT EXISTS posts (
//     post_id int4 NOT NULL GENERATED ALWAYS AS IDENTITY,
//     title varchar NULL COLLATE "en_US.utf8",
//     "content" text NULL COLLATE "en_US.utf8",
//     users_id serial4 NOT NULL,
//     created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
//     CONSTRAINT posts_pk PRIMARY KEY (post_id),
//     CONSTRAINT posts_fk FOREIGN KEY (users_id) REFERENCES public.users(id)
//   )
// `)

// pool.query(`
//   CREATE TABLE IF NOT EXISTS reports (
//     report_id int4 NOT NULL GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE),
//     reporter varchar NULL DEFAULT 'Anonymous'::character varying,
//     bug_type varchar NULL COLLATE "en_US.utf8",
//     bug_detail text NULL COLLATE "en_US.utf8",
//     bug_level varchar NULL DEFAULT 'NORMAL'::character varying COLLATE "en_US.utf8",
//     created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
//     is_handled bool NULL DEFAULT false
//   )
// `)

// pool.query(`
//   CREATE TABLE IF NOT EXISTS server_metrics (
//     stars numeric NOT NULL DEFAULT 5,
//     rates int4 NOT NULL DEFAULT 0
//   )
// `)

// pool.query('SELECT NOW()', (err, res) => {
//   if (err) {
//     console.error('Lỗi khi kết nối đến PostgreSQL:', err)
//   } else {
//     console.log('Kết nối thành công vào PostgreSQL, thời gian hiện tại:', res.rows[0].now)
//   }
// })

// // Xuất pool
// module.exports = pool
